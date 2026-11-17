import { useEffect, useRef, useState } from "react";
import { englishUUID } from "../../../packages/english/id.ts";
import type {
  AttemptEvidence,
  EnglishCatalog,
  QuizView,
} from "../../../packages/english/contract.ts";
type Reply = QuizView & {
  latestEvidence?: AttemptEvidence;
  evidence?: AttemptEvidence[];
};

export function Pk({
  catalog,
  command,
  onEvidence,
}: {
  catalog: EnglishCatalog;
  command: (body: unknown) => Promise<any>;
  onEvidence: (e: AttemptEvidence) => void;
}) {
  const [bank, setBank] = useState(catalog.banks[0]?.id ?? "core2000");
  const [q, setQ] = useState<Reply | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<Reply | null>(null);
  const revision = useRef(-1);
  const generation = useRef(0);
  const pending = useRef<Record<string, unknown> | null>(null);
  const polling = useRef(false);
  const currentCommand = useRef(command);
  const currentEvidence = useRef(onEvidence);
  currentCommand.current = command;
  currentEvidence.current = onEvidence;
  function apply(x: Reply, gen: number) {
    if (gen !== generation.current || !x.pk) return;
    // Immutable attempt evidence remains valid even when a newer tick already
    // advanced the view. The parent de-duplicates by attemptId.
    if (x.latestEvidence) currentEvidence.current(x.latestEvidence);
    for (const e of x.evidence ?? []) currentEvidence.current(e);
    if (x.pk.revision < revision.current) return;
    revision.current = x.pk.revision;
    active.current = x;
    setQ(x);
  }
  useEffect(() => {
    const timer = setInterval(async () => {
      const game = active.current;
      if (!game || game.pk?.finished || polling.current || pending.current)
        return;
      const gen = generation.current;
      polling.current = true;
      try {
        const x = await currentCommand.current({
          action: "pk-tick",
          sessionId: game.sessionId,
          requestId: englishUUID(),
        });
        apply(x, gen);
        if (gen === generation.current) setError("");
      } catch {
        if (gen === generation.current)
          setError(
            "连接中断，输入仍在。恢复后会核对本局时间；比赛不会暂停计时。",
          );
      } finally {
        polling.current = false;
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      generation.current++;
      const game = active.current;
      active.current = null;
      if (game)
        void currentCommand
          .current({
            action: "close",
            sessionId: game.sessionId,
            requestId: englishUUID(),
          })
          .catch(() => {});
    };
  }, []);
  async function start() {
    if (busy) return;
    const gen = ++generation.current;
    const old = active.current;
    active.current = null;
    pending.current = null;
    revision.current = -1;
    setBusy(true);
    setError("");
    setFeedback("");
    setAnswer("");
    setQ(null);
    if (old)
      void command({
        action: "close",
        sessionId: old.sessionId,
        requestId: englishUUID(),
      }).catch(() => {});
    try {
      const x = await command({ action: "pk-start", bankId: bank });
      if (gen !== generation.current) {
        void command({
          action: "close",
          sessionId: x.sessionId,
          requestId: englishUUID(),
        }).catch(() => {});
        return;
      }
      apply(x, gen);
      requestAnimationFrame(() => input.current?.focus());
    } catch (e) {
      if (gen === generation.current) setError((e as Error).message);
    } finally {
      if (gen === generation.current) setBusy(false);
    }
  }
  async function submit() {
    if (!q || q.pk?.finished || busy) return;
    if (!pending.current && !answer.trim()) {
      setError("先写下你想到的英文单词。");
      input.current?.focus();
      return;
    }
    pending.current ??= {
      action: "answer",
      sessionId: q.sessionId,
      taskId: q.taskId,
      requestId: englishUUID(),
      answer,
    };
    const body = pending.current,
      gen = generation.current;
    setBusy(true);
    setError("");
    try {
      const x = await command(body);
      if (gen !== generation.current) return;
      apply(x, gen);
      pending.current = null;
      if (x.latestEvidence?.answerCorrect) {
        setAnswer("");
        setFeedback("拼对了，+100 比赛分！");
      } else if (x.latestEvidence) {
        setFeedback(
          x.feedback?.nearMiss
            ? "意思接近；这题练的是词库中的目标词。可以退出回看词卡，首答会保留。"
            : "这次拼写还不对，检查后可以再试。首答会保留。",
        );
        input.current?.select();
      }
      requestAnimationFrame(() => input.current?.focus());
    } catch (e) {
      if (gen === generation.current)
        setError(
          "这次提交没有确认，输入已保留。点击重试会核对同一次提交，不会重复计分。",
        );
    } finally {
      if (gen === generation.current) setBusy(false);
    }
  }
  function exit() {
    generation.current++;
    const old = active.current;
    active.current = null;
    pending.current = null;
    revision.current = -1;
    setQ(null);
    setAnswer("");
    setFeedback("");
    setError("");
    setBusy(false);
    if (old)
      void command({
        action: "close",
        sessionId: old.sessionId,
        requestId: englishUUID(),
      }).catch(() => {});
  }
  const game = q?.pk;
  return (
    <section
      className={
        "english-pk" + (q && !game?.finished ? " english-pk-playing" : "")
      }
      data-english-pk
    >
      <header className="english-heading">
        <div>
          <h1>和闪电狐拼一局</h1>
          {(!q || game?.finished) && (
            <p>
              45 秒，最多 5 个词。看意思写英文，拼对一个得 100
              比赛分。可以订正，首答会保留。
            </p>
          )}
        </div>
      </header>
      <p className="english-pk-boundary">
        {q && !game?.finished
          ? "本局比赛分不计入学习币；可以随时退出。"
          : "闪电狐是按固定节奏得分的本机机器人。比赛分只在本局使用，不兑换学习币，也不表示独立掌握。"}
      </p>
      {!q ? (
        <div className="english-pk-lobby">
          <div className="english-pk-versus">
            <span>Kevin</span>
            <b aria-hidden="true">VS</b>
            <span>
              <span aria-hidden="true">🦊 </span>闪电狐
            </span>
          </div>
          <label>
            比赛词库
            <select
              value={bank}
              disabled={busy}
              onChange={(e) => setBank(e.target.value)}
            >
              {catalog.banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}（{b.count}词）
                </option>
              ))}
            </select>
          </label>
          <p>
            比赛中不提供读音、字母提示或参考答案。想慢慢学，可以随时退出，回到词卡练习。
          </p>
          <button
            type="button"
            className="english-primary"
            disabled={busy}
            onClick={start}
          >
            {busy ? "正在准备这一局…" : "开始 45 秒挑战"}
          </button>
        </div>
      ) : game?.finished ? (
        <section className="english-pk-result" data-pk-result>
          <h2>
            {game.outcome === "won"
              ? "这一局你领先！"
              : game.outcome === "tied"
                ? "这一局打成平手！"
                : "这一局闪电狐领先"}
          </h2>
          <p>
            {game.reason === "time-up" ? "45 秒到了。" : "这一组都拼出来了。"}{" "}
            Kevin {game.score} 分，闪电狐 {game.botScore} 分。
          </p>
          <p>下面分开看首答、订正和未作答的词。比赛输赢不代替学习记录。</p>
          <div className="english-pk-review">
            {game.review?.map((c) => (
              <article key={c.wordId}>
                <h3>{c.word}</h3>
                <p>{c.definition}</p>
                <p>
                  {c.firstAnswer === null
                    ? "本局未作答"
                    : c.firstCorrect
                      ? "首答拼写正确"
                      : c.corrected
                        ? "首答有错，已自主订正"
                        : "首答有错，尚未订正"}
                </p>
                {c.firstAnswer !== null && <p>你的首答：{c.firstAnswer}</p>}
              </article>
            ))}
          </div>
          <div className="english-actions">
            <button type="button" className="english-primary" onClick={start}>
              再来一局
            </button>
            <button type="button" onClick={exit}>
              返回比赛准备
            </button>
            <a href="/subjects/english">回到英语书架</a>
          </div>
        </section>
      ) : (
        <section className="english-pk-arena" aria-label="本局拼写">
          <div className="english-pk-score">
            <span>
              Kevin <strong>{game?.score}</strong>
            </span>
            <span className="english-pk-clock" aria-label="剩余时间">
              {game?.seconds} 秒
            </span>
            <span>
              闪电狐 <strong>{game?.botScore}</strong>
            </span>
          </div>
          <ol className="english-pk-track" aria-label="已完成单词">
            {Array.from({ length: game?.total ?? 5 }, (_, i) => (
              <li
                key={i}
                data-done={i < (game?.answered ?? 0)}
                aria-current={i === (game?.answered ?? 0) ? "step" : undefined}
              >
                {i < (game?.answered ?? 0) ? "✓" : i + 1}
              </li>
            ))}
          </ol>
          <p>
            第 {q.index + 1} / {q.total} 个词
          </p>
          {q.image && (
            <img
              className="english-pk-image"
              src={q.image}
              alt="本题来源配图"
            />
          )}
          <p className="english-pk-clue">{q.clue}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label>
              输入完整英文单词
              <input
                ref={input}
                value={answer}
                onChange={(e) => {
                  if (!pending.current) setAnswer(e.target.value);
                }}
                readOnly={busy || !!pending.current}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={200}
              />
            </label>
            <button className="english-primary" disabled={busy} type="submit">
              {busy
                ? "正在核对…"
                : pending.current
                  ? "重试这次提交"
                  : "提交拼写"}
            </button>
          </form>
          <p className="english-pk-feedback" role="status">
            {feedback || "看清意思，再写下你想到的单词。"}
          </p>
          <button type="button" onClick={exit}>
            退出本局，慢慢练习
          </button>
        </section>
      )}
      {error && (
        <p className="english-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
