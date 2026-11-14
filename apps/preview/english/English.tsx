import { useEffect, useRef, useState } from "react";
import { englishUUID } from "../../../packages/english/id.ts";
import { EnglishTraining } from "../../../packages/english/training.ts";
import {
  inspectPack,
  localPackCards,
  packContent,
} from "../../../packages/english/pack.ts";
import type {
  EnglishCatalog,
  EnglishGroup,
  EnglishCard,
  QuizView,
  AttemptEvidence,
} from "../../../packages/english/contract.ts";
type Card = Omit<
  EnglishCard,
  "spellingVariants" | "semanticAlternatives" | "quizClue"
> & { groupId: string };
type PageGroup = { group: EnglishGroup; cards: Card[] };
const prefix = "/preview-api/v1/english";
async function get<T>(path: string): Promise<T> {
  const r = await fetch(prefix + path, { cache: "no-store" });
  const x = await r.json();
  if (!r.ok) throw Error(x.message || "内容暂时没有打开，请重试。");
  return x;
}
async function command(body: unknown) {
  const r = await fetch(prefix + "/training", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const x = await r.json();
  if (!r.ok) throw Error(x.message || "操作未完成，请重试。");
  return x;
}
const path = (params: Record<string, string>) =>
  "/subjects/english?" + new URLSearchParams(params).toString();
const memory = {
  saved: new Map<string, Card>(),
  events: [] as AttemptEvidence[],
  seen: new Set<string>(),
};
function useSpeech() {
  const [message, setMessage] = useState("");
  useEffect(
    () => () => {
      globalThis.speechSynthesis?.cancel();
    },
    [],
  );
  return {
    message,
    stop() {
      globalThis.speechSynthesis?.cancel();
      setMessage("已停止播放。");
    },
    speak(text: string) {
      if (!("speechSynthesis" in window)) {
        setMessage("当前浏览器不支持系统发音，可以继续阅读或练习。");
        return;
      }
      const play = () => {
        const voice = speechSynthesis
          .getVoices()
          .find((v) => v.lang.toLowerCase().startsWith("en"));
        if (!voice) {
          setMessage(
            "还没有可用的英语语音，请在电脑系统中安装英语声音后重试。",
          );
          return;
        }
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = voice.lang;
        u.voice = voice;
        u.rate = 0.78;
        u.onstart = () => setMessage("正在播放，可点击停止。");
        u.onend = () => setMessage("播放结束。");
        u.onerror = () =>
          setMessage("这次声音没有播放，请检查系统语音或重试。");
        speechSynthesis.speak(u);
      };
      play();
    },
  };
}
export default function English() {
  const [catalog, setCatalog] = useState<EnglishCatalog | null>(null),
    [error, setError] = useState(""),
    [route, setRoute] = useState(location.search),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    get<EnglishCatalog>("/catalog")
      .then((x) => {
        if (live) setCatalog(x);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const update = () => setRoute(location.search);
    const click = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (
        !a ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        a.target ||
        a.hasAttribute("download")
      )
        return;
      const u = new URL(a.href);
      if (
        u.origin === location.origin &&
        u.pathname === "/subjects/english" &&
        !u.hash
      ) {
        e.preventDefault();
        history.pushState(null, "", u);
        update();
      }
    };
    document.addEventListener("click", click);
    addEventListener("popstate", update);
    return () => {
      document.removeEventListener("click", click);
      removeEventListener("popstate", update);
    };
  }, []);
  const q = new URLSearchParams(route),
    bank = q.get("bank"),
    group = q.get("group"),
    view = q.get("view"),
    book = Number(q.get("book") || 1);
  const refresh = () => setTick((x) => x + 1);
  if (error)
    return (
      <section className="english-empty" role="alert">
        <h1>英语内容还没有装载</h1>
        <p>{error}</p>
        <p>家庭内容包需要与来源清单核对后装载；数学和探索仍可正常使用。</p>
        <a href="/">返回家园</a>
      </section>
    );
  if (!catalog) return <p role="status">正在打开英语书架…</p>;
  const selected = catalog.banks.find((x) => x.id === bank);
  return (
    <div
      className="english-page"
      data-english-page
      data-english-version={catalog.contentVersion}
    >
      <nav className="english-crumb" aria-label="英语位置">
        <a href="/">家园</a>
        <span>/</span>
        <a href="/subjects/english">英语天地</a>
        {selected && (
          <>
            <span>/</span>
            <a href={path({ bank: selected.id })}>{selected.title}</a>
          </>
        )}
        {group && (
          <>
            <span>/</span>
            <span>学习组</span>
          </>
        )}
      </nav>
      <div className="english-notice">
        本次体验只在当前英语页面暂存；刷新或离开后不保留。正式跨天复习和统一积分尚未启用。
      </div>
      <nav className="english-tabs" aria-label="英语活动">
        <a href="/subjects/english" aria-current={!view ? "page" : undefined}>
          英语书架
        </a>
        <a
          href={path({ view: "notebook" })}
          aria-current={view === "notebook" ? "page" : undefined}
        >
          本次收藏 {memory.saved.size || ""}
        </a>
        <a
          href={path({ view: "review" })}
          aria-current={view === "review" ? "page" : undefined}
        >
          本次回顾
        </a>
        <a
          href={path({ view: "pack" })}
          aria-current={view === "pack" ? "page" : undefined}
        >
          生词包
        </a>
        <a
          href={path({ view: "source" })}
          aria-current={view === "source" ? "page" : undefined}
        >
          内容与声音
        </a>
      </nav>
      {view === "source" ? (
        <section className="english-explanation">
          <h1>内容与声音</h1>
          <p>
            内容来源固定版本：<code>{catalog.sourceSha.slice(0, 7)}</code>
            。书名中的2000不代表当前词卡数；这里实际有1280张核心词卡。
          </p>
          <p>
            发音使用电脑或浏览器提供的英语声音，需主动点击。没有原书真人录音；部分系统需要先安装英语声音。
          </p>
          <p>
            教材来源图片仅用于此家庭内容包。公开分发许可尚未完成核对；Wikimedia图片的作者和许可在词卡下单独显示，缺项仍标记待核对。
          </p>
          <p>
            本次页面无账号、无数据库、无真实金币。不能把一次订正或本次回顾当作隔日独立掌握。
          </p>
        </section>
      ) : view === "notebook" ? (
        <section>
          <h1>本次收藏</h1>
          <p>
            收藏只在这次英语页面中保留。
            {memory.saved.size
              ? "可以选一张继续看。"
              : "在词卡上点击“加入本次收藏”，单词就会出现在这里。"}
          </p>
          <WordCollection
            cards={[...memory.saved.values()]}
            title="所选收藏"
            refresh={refresh}
          />
        </section>
      ) : view === "review" ? (
        <Review catalog={catalog} refresh={refresh} />
      ) : view === "pack" ? (
        <WordPack />
      ) : group && selected ? (
        <Group
          key={group + ":" + q.get("word") + ":" + q.get("practice")}
          id={group}
          wordId={q.get("word")}
          practice={q.get("practice")}
          refresh={refresh}
        />
      ) : selected ? (
        <section>
          <header className="english-heading">
            <div>
              <h1>{selected.title}</h1>
              <p>
                {selected.count} 张词卡，{selected.groups}{" "}
                个学习组。可以直接选择需要的内容。
              </p>
            </div>
          </header>
          {selected.books > 0 && (
            <nav className="english-books" aria-label="选择册数">
              {[1, 2, 3, 4].map((n) => (
                <a
                  key={n}
                  href={path({ bank: selected.id, book: String(n) })}
                  aria-current={book === n ? "page" : undefined}
                >
                  Book {n}
                </a>
              ))}
            </nav>
          )}
          <GroupPicker catalog={catalog} bank={selected.id} book={book} />
        </section>
      ) : (
        <section>
          <header className="english-heading">
            <div>
              <h1>
                打开一本书，
                <br />
                认识一个新词。
              </h1>
              <p>看词卡，听一听，再合上词卡自己拼写。</p>
            </div>
            <div className="english-bookmark" aria-hidden="true">
              <span>Aa</span>
              <i>Words & stories</i>
            </div>
          </header>
          <div className="english-banks">
            {catalog.banks.map((b, i) => (
              <a
                key={b.id}
                href={path({ bank: b.id })}
                className={"english-bank bank-" + i}
              >
                <span className="english-spine" aria-hidden="true">
                  {b.id === "core2000" ? "4 books" : b.id.toUpperCase()}
                </span>
                <h2>{b.title}</h2>
                <p>{b.count} 张词卡</p>
                <span>选择学习组</span>
              </a>
            ))}
          </div>
          <p className="english-footnote">
            每次选一组就好。休息不会扣分，也不需要赶完所有单词。
          </p>
        </section>
      )}
    </div>
  );
}
function GroupPicker({
  catalog,
  bank,
  book,
}: {
  catalog: EnglishCatalog;
  bank: string;
  book: number;
}) {
  const [query, setQuery] = useState("");
  const groups = catalog.groups.filter(
    (g) =>
      g.bankId === bank &&
      (g.book === null || g.book === book) &&
      (!query ||
        (g.title + " " + (g.preview || ""))
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return (
    <>
      <label className="english-filter">
        查找学习组
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如 Unit 3 或 第 12 组"
        />
      </label>
      <div className="english-groups">
        {groups.map((g) => (
          <a key={g.id} href={path({ bank, group: g.id })}>
            <b>{g.book ? "Unit " + g.unit : "第 " + g.unit + " 组"}</b>
            <span>{g.half ? "Set " + g.half.toUpperCase() : "10词以内"}</span>
            <small>
              {g.preview ||
                (g.exercise ? "词卡 · 拼写 · 教材练习" : "词卡 · 拼写")}
            </small>
          </a>
        ))}
      </div>
      {!groups.length && (
        <p role="status">没找到这个学习组，可以换一个数字或清空搜索。</p>
      )}
    </>
  );
}
function Group({
  id,
  wordId,
  practice,
  refresh,
}: {
  id: string;
  wordId: string | null;
  practice: string | null;
  refresh: () => void;
}) {
  const [data, setData] = useState<PageGroup | null>(null),
    [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [mode, setMode] = useState(practice ? "full" : "cards"),
    [session, setSession] = useState<QuizView | null>(null),
    [busy, setBusy] = useState(false);
  const speech = useSpeech();
  useEffect(() => {
    let live = true;
    get<PageGroup>("/groups/" + encodeURIComponent(id))
      .then((x) => {
        if (live) {
          setData(x);
          const i = x.cards.findIndex((c) => c.id === wordId);
          setIndex(Math.max(0, i));
          if (practice) void begin("full", wordId ? [wordId] : undefined);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
      speech.stop();
    };
  }, [id]);
  async function begin(next: string, ids?: string[]) {
    setBusy(true);
    setError("");
    speech.stop();
    try {
      const x = await command({
        action: "start",
        groupId: id,
        mode: next === "review" ? "full" : next,
        source: next === "review" ? "review" : "new",
        ...(ids ? { wordIds: ids } : {}),
      });
      setSession(x);
      setMode("quiz");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <p role={error ? "alert" : "status"}>{error || "正在翻开学习组…"}</p>
    );
  const c = data.cards[index];
  return (
    <section data-english-group={id}>
      <header className="english-group-heading">
        <h1>{data.group.title}</h1>
        <a
          href={path({
            bank: c.bankId,
            ...(data.group.book ? { book: String(data.group.book) } : {}),
          })}
        >
          返回学习组目录
        </a>
      </header>
      <div className="english-mode-bar" aria-label="本组学习方式">
        <button
          aria-pressed={mode === "cards"}
          onClick={() => {
            setMode("cards");
            speech.stop();
          }}
        >
          词卡
        </button>
        <button disabled={busy} onClick={() => begin("sequence")}>
          补空，再完整拼写
        </button>
        <button disabled={busy} onClick={() => begin("full")}>
          直接完整拼写
        </button>
        <button disabled={busy} onClick={() => begin("sprint")}>
          本组小挑战
        </button>
        {data.group.exercise && (
          <button
            onClick={() => {
              setMode("exercise");
              speech.stop();
            }}
          >
            教材练习
          </button>
        )}
        {data.group.readingImages.length > 0 && (
          <button
            onClick={() => {
              setMode("reading");
              speech.stop();
            }}
          >
            阅读页
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {mode === "quiz" && session ? (
        <Quiz
          initial={session}
          group={data.group}
          refresh={refresh}
          onBack={() => setMode("cards")}
          key={session.sessionId}
        />
      ) : mode === "exercise" ? (
        <Workbook data={data} />
      ) : mode === "reading" ? (
        <div className="english-reading">
          {data.group.readingImages.map((im, i) => (
            <img key={im} src={im} alt={"本组阅读页 " + (i + 1)} />
          ))}
        </div>
      ) : (
        <>
          <div className="english-card" data-word-card>
            <figure>
              {c.image ? (
                <img src={c.image} alt={"单词 " + c.word + " 的来源配图"} />
              ) : (
                <div className="english-no-picture">
                  <span>{c.word}</span>
                  <p>这个词的来源没有配图，结合释义和例句来理解。</p>
                </div>
              )}
            </figure>
            <div className="english-card-text">
              <p className="english-card-position">
                第 {index + 1} / {data.cards.length} 张
              </p>
              <h2 lang="en">{c.word}</h2>
              <p className="english-phonetic">
                {c.ipa} {c.pos}
              </p>
              <div className="english-sound">
                <button onClick={() => speech.speak(c.word)}>听单词</button>
                <button onClick={speech.stop}>停止</button>
              </div>
              <p lang="en" className="english-definition">
                {c.en}
              </p>
              {c.zh && <p>{c.zh}</p>}
              {c.example && (
                <blockquote lang="en">
                  {c.example}
                  <button onClick={() => speech.speak(c.example)}>
                    听例句
                  </button>
                </blockquote>
              )}
              {c.chunks.length > 1 && (
                <details>
                  <summary>看拼写分块</summary>
                  <p lang="en">{c.chunks.join(" · ")}</p>
                  <small>这是记忆拼写的分块，不一定是词源或音节。</small>
                </details>
              )}
              <button
                className="english-save"
                aria-pressed={memory.saved.has(c.id)}
                onClick={() => {
                  if (memory.saved.has(c.id)) memory.saved.delete(c.id);
                  else memory.saved.set(c.id, c);
                  refresh();
                }}
              >
                {memory.saved.has(c.id) ? "移出本次收藏" : "加入本次收藏"}
              </button>
              {c.attribution && (
                <details className="english-attribution">
                  <summary>图片来源</summary>
                  <p>
                    {c.attribution.creator || "作者待核对"} ·{" "}
                    {c.attribution.license || "许可待核对"}
                  </p>
                  <p>{c.attribution.sourceUrl}</p>
                  {!c.attribution.licenseUrl && <p>许可证链接待补充核对。</p>}
                </details>
              )}
            </div>
          </div>
          <div className="english-card-controls">
            <button
              disabled={index === 0}
              onClick={() => {
                speech.stop();
                setIndex((i) => i - 1);
              }}
            >
              上一张
            </button>
            <button
              onClick={() => {
                memory.seen.add(c.id);
                if (index < data.cards.length - 1) {
                  speech.stop();
                  setIndex((i) => i + 1);
                } else void begin("sequence");
              }}
            >
              {index === data.cards.length - 1
                ? "合上词卡，开始拼写"
                : "下一张"}
            </button>
          </div>
          <p role="status" className="english-speech-status">
            {speech.message}
          </p>
        </>
      )}
    </section>
  );
}
function Quiz({
  initial,
  group,
  onBack,
  refresh,
  transport = command,
}: {
  initial: QuizView;
  group: EnglishGroup;
  onBack: () => void;
  refresh: () => void;
  transport?: (body: unknown) => Promise<any>;
}) {
  const [q, setQ] = useState(initial),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState<any>(null),
    [summary, setSummary] = useState<AttemptEvidence[]>([]);
  const speech = useSpeech(),
    input = useRef<HTMLInputElement>(null),
    pending = useRef<{ body: any; action: string } | null>(null);
  async function act(action: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    speech.stop();
    const body =
      pending.current?.action === action
        ? pending.current.body
        : {
            action,
            sessionId: q.sessionId,
            taskId: q.taskId,
            requestId: englishUUID(),
            ...(action === "answer" ? { answer } : {}),
          };
    pending.current = { action, body };
    try {
      const x = await transport(body);
      pending.current = null;
      if (action === "summary") {
        setSummary(x.evidence);
        const known = new Set(memory.events.map((e) => e.attemptId));
        for (const e of x.evidence)
          if (e.bankId !== "custom" && !known.has(e.attemptId))
            memory.events.push(e);
        refresh();
        return;
      }
      setQ(x);
      if (
        x.latestEvidence &&
        x.latestEvidence.bankId !== "custom" &&
        !memory.events.some((e) => e.attemptId === x.latestEvidence.attemptId)
      ) {
        memory.events.push(x.latestEvidence);
        refresh();
      }
      if (action === "audio") speech.speak(x.speech);
      if (x.reference) setReference(x.reference);
      if (action === "next") {
        setAnswer("");
        setReference(null);
        requestAnimationFrame(() => input.current?.focus());
      }
      if (x.done) {
        const s = { evidence: x.evidence ?? [] };
        setSummary(s.evidence);
        const known = new Set(memory.events.map((e) => e.attemptId));
        for (const e of s.evidence)
          if (e.bankId !== "custom" && !known.has(e.attemptId))
            memory.events.push(e);
        refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (q.done)
    return (
      <section className="english-result" data-english-result>
        <h2>这一组拼写完成了。</h2>
        <p>
          {
            summary.filter(
              (e) =>
                e.firstAttempt &&
                e.firstAttemptCorrect &&
                !e.usedHint &&
                !e.answerShown &&
                e.mode === "full",
            ).length
          }{" "}
          次完整拼写首答正确；订正和用过提示的记录分别保留。
        </p>
        <p>这是本次练习结果，还不能说明隔日记住了。</p>
        <button onClick={onBack}>回看词卡</button>
        <a href={path({ view: "review" })}>去本次回顾</a>
      </section>
    );
  return (
    <div className="english-quiz" data-english-quiz>
      <header>
        <span>
          第 {q.index + 1} / {q.total} 题
        </span>
        <h2>{q.mode === "cloze" ? "补齐缺少的字母" : "合上词卡，自己拼写"}</h2>
        <p>根据词义写出这个学习组中的目标词；也可以主动听读音。</p>
      </header>
      <div className="english-quiz-body">
        {q.image && (
          <figure>
            <img src={q.image} alt="这道题的配图" />
          </figure>
        )}
        <div className="english-answer-zone">
          <p className="english-quiz-clue" lang="en">
            {q.clue || "这道题没有独立文字线索，请听读音后拼写。"}
          </p>
          {q.mask && (
            <p className="english-mask" aria-label="字母提示">
              {q.mask}
            </p>
          )}
          <button disabled={busy} onClick={() => act("audio")}>
            听读音
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act("answer");
            }}
          >
            <label>
              写出完整单词或短语
              <input
                ref={input}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={answer}
                disabled={
                  q.feedback?.correct ||
                  busy ||
                  pending.current?.action === "answer"
                }
                onChange={(e) => {
                  setAnswer(e.target.value);
                }}
              />
            </label>
            {!q.feedback?.correct && (
              <button
                className="english-primary"
                disabled={busy || !answer.trim()}
              >
                确认这次答案
              </button>
            )}
          </form>
          {q.hint && <p>{q.hint}。使用提示会单独记录。</p>}
          {q.feedback && (
            <div
              role="status"
              className={
                "english-feedback " + (q.feedback.correct ? "correct" : "retry")
              }
            >
              <b>
                {q.feedback.correct
                  ? q.firstAnswer?.correct && !q.firstAnswer.assisted
                    ? "首答正确。"
                    : "这次订正正确。"
                  : "还需要订正。首答已经保留。"}
              </b>
              {q.feedback.nearMiss && (
                <p>这个答案意思接近，但这题练的是本组目标词的拼写。</p>
              )}
              {q.feedback.answer && (
                <p lang="en">
                  {q.feedback.answer} — {q.feedback.definition}
                </p>
              )}
              {!q.feedback.correct && (
                <p>再看看字母和词义，也可以点提示或回看参考。</p>
              )}
            </div>
          )}
          {q.firstAnswer && !q.firstAnswer.correct && (
            <p className="english-first">
              首答：{q.firstAnswer.answer}（保留不覆盖）
            </p>
          )}
          {reference && (
            <aside className="english-reference">
              <b lang="en">{reference.word}</b>
              <p>{reference.en}</p>
              <p>{reference.example}</p>
              <small>已记为看过参考后的练习。</small>
            </aside>
          )}
          {q.feedback?.correct ? (
            <button
              className="english-primary"
              disabled={busy}
              onClick={() => act("next")}
            >
              {q.index + 1 === q.total ? "查看本次结果" : "下一题"}
            </button>
          ) : (
            <div className="english-help">
              <button disabled={busy} onClick={() => act("hint")}>
                给一个首字母提示
              </button>
              <button disabled={busy} onClick={() => act("reference")}>
                看参考后再练
              </button>
            </div>
          )}
        </div>
      </div>
      <p role="status">{speech.message}</p>
      {error && (
        <p role="alert">
          {error} 网络恢复后可重试；本页输入仍保留。
          {pending.current && (
            <button onClick={() => act(pending.current!.action)}>
              重试刚才提交
            </button>
          )}
        </p>
      )}
      <button className="english-quiet" onClick={onBack}>
        回到本组词卡
      </button>
    </div>
  );
}
function Workbook({ data }: { data: PageGroup }) {
  const exercise = data.group.exercise!,
    [answers, setAnswers] = useState<string[]>(
      Array(exercise.answerSlots).fill(""),
    ),
    [result, setResult] = useState<
      { index: number; correct: boolean }[] | null
    >(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const first = useRef<string[] | null>(null),
    session = useRef<string | null>(null);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (!session.current) {
        const x = await command({
          action: "start",
          groupId: data.group.id,
          mode: "full",
        });
        session.current = x.sessionId;
      }
      const r = await command({
        action: "exercise",
        sessionId: session.current,
        requestId: englishUUID(),
        responses: answers,
      });
      first.current ??= [...answers];
      setResult(r.checks);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="english-workbook">
      <h2>看教材页，逐题作答</h2>
      <p>题号按原页顺序填写。答案由服务核对，不放在页面或图片标签里。</p>
      <img src={exercise.image} alt="本学习组教材练习页" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="english-workbook-inputs">
          {answers.map((v, i) => (
            <label key={i}>
              第 {i + 1} 题
              <input
                value={v}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) =>
                  setAnswers((a) =>
                    a.map((x, j) => (i === j ? e.target.value : x)),
                  )
                }
              />
              {result && (
                <span>{result[i].correct ? "这题正确" : "再检查这题"}</span>
              )}
            </label>
          ))}
        </div>
        <button disabled={busy || answers.some((a) => !a.trim())}>
          核对这一页
        </button>
      </form>
      {first.current && (
        <p>首轮填写已保留；之后可以继续订正。本次结果不计正式积分。</p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function Review({
  catalog,
  refresh,
}: {
  catalog: EnglishCatalog;
  refresh: () => void;
}) {
  const errors = [
      ...new Set(
        memory.events.filter((e) => !e.answerCorrect).map((e) => e.wordId),
      ),
    ],
    full = memory.events.filter((e) => e.mode === "full" && e.firstAttempt),
    [cards, setCards] = useState<Card[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all(
      errors.map((id) => get<Card>("/cards/" + encodeURIComponent(id))),
    ).then((x) => {
      if (live) setCards(x);
    });
    return () => {
      live = false;
    };
  }, [errors.join("|")]);
  return (
    <section>
      <h1>本次回顾</h1>
      <p>
        完整拼写首答 {full.length} 次，首答正确{" "}
        {
          full.filter((e) => e.answerCorrect && !e.usedHint && !e.answerShown)
            .length
        }{" "}
        次。订正不改写第一次的答案。
      </p>
      <p>
        这里回看当前页面中做错过的词；跨天复习、长期统计和历史学习记录待正式启用。
      </p>
      {!cards.length ? (
        <p className="english-empty">
          暂时没有错词。先选一个学习组做完整拼写。
        </p>
      ) : (
        <WordCollection cards={cards} title="所选错词" refresh={refresh} />
      )}
      <p>休息不会让记录变成“失败”，也不会扣分。</p>
    </section>
  );
}
function WordCollection({
  cards,
  title,
  refresh,
}: {
  cards: Card[];
  title: string;
  refresh: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
      new Set(cards.map((c) => c.id)),
    ),
    [quiz, setQuiz] = useState<QuizView | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function begin(bank: string) {
    const chosen = cards
      .filter((c) => c.bankId === bank && selected.has(c.id))
      .slice(0, 30);
    if (!chosen.length) {
      setError("先在这个词库勾选想练的词。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setQuiz(
        await command({
          action: "start",
          groupId: chosen[0].groupId,
          mode: "full",
          source: "review",
          wordIds: chosen.map((c) => c.id),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (quiz)
    return (
      <Quiz
        initial={quiz}
        group={{
          id: "selected",
          bankId: "",
          title,
          book: null,
          unit: 0,
          half: null,
          wordIds: [],
          readingImages: [],
        }}
        onBack={() => setQuiz(null)}
        refresh={refresh}
      />
    );
  return (
    <div>
      <div className="english-collection-actions">
        <button onClick={() => setSelected(new Set(cards.map((c) => c.id)))}>
          全选本页
        </button>
        <button onClick={() => setSelected(new Set())}>取消全选</button>
        {[...new Set(cards.map((c) => c.bankId))].map((bank) => (
          <button key={bank} disabled={busy} onClick={() => begin(bank)}>
            练习{bank === "core2000" ? "核心词卡" : bank.toUpperCase()}
            {title}
          </button>
        ))}
      </div>
      <div className="english-word-list">
        {cards.map((c) => (
          <article key={c.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={(e) =>
                  setSelected((old) => {
                    const n = new Set(old);
                    if (e.target.checked) n.add(c.id);
                    else n.delete(c.id);
                    return n;
                  })
                }
              />
              选择 {c.word}
            </label>
            <a href={path({ bank: c.bankId, group: c.groupId, word: c.id })}>
              <b>{c.word}</b>
              <span>{c.zh || c.en}</span>
            </a>
          </article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function WordPack() {
  const [status, setStatus] = useState(""),
    [preview, setPreview] = useState<ReturnType<typeof inspectPack> | null>(
      null,
    ),
    [cards, setCards] = useState<EnglishCard[]>([]),
    [selected, setSelected] = useState<Set<number>>(new Set()),
    [quiz, setQuiz] = useState<QuizView | null>(null),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false);
  const engine = useRef<EnglishTraining | null>(null),
    urls = useRef<string[]>([]);
  const speech = useSpeech();
  useEffect(
    () => () => {
      for (const u of urls.current) URL.revokeObjectURL(u);
      engine.current?.clear();
    },
    [],
  );
  async function load(f: File) {
    setStatus("");
    setPreview(null);
    setQuiz(null);
    engine.current?.clear();
    for (const u of urls.current) URL.revokeObjectURL(u);
    urls.current = [];
    setCards([]);
    if (f.size > 1500000) {
      setStatus("文件超过1.5MB，请减少词条或图片。");
      return;
    }
    setBusy(true);
    try {
      const p = inspectPack(JSON.parse(await f.text()));
      const result = await localPackCards(p);
      urls.current = result.urls;
      setCards(result.cards);
      setPreview(p);
      setSelected(new Set(p.words.flatMap((w, i) => (w.train ? [i] : []))));
      setIndex(0);
    } catch (e) {
      setStatus(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "格式不完整，请检查V1词包字段和每个词的图片。",
      );
    } finally {
      setBusy(false);
    }
  }
  function begin() {
    const chosen = cards.filter((_, i) => selected.has(i));
    if (!chosen.length) {
      setStatus("先选至少一个词，再开始训练。");
      return;
    }
    const e = new EnglishTraining(packContent(chosen));
    engine.current = e;
    setQuiz(
      e.start({ action: "start", groupId: "local-pack", mode: "sequence" }),
    );
    speech.stop();
  }
  const content = engine.current;
  return (
    <section>
      <h1>导入本次生词包</h1>
      <p>
        只读取你主动选择的文件，图片、预览和练习都留在本页内存，不上传服务器。刷新清空，不调用AI。
      </p>
      <label className="english-file">
        选择生词包
        <input
          type="file"
          accept="application/json,.wordpack.json"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
          }}
        />
      </label>
      {busy && <p role="status">正在核对词形和图片…</p>}
      {status && <p role="alert">{status}</p>}
      {quiz && content ? (
        <Quiz
          initial={quiz}
          group={content.content.group("local-pack").group}
          key={quiz.sessionId}
          refresh={() => {}}
          onBack={() => setQuiz(null)}
          transport={async (body) => content.act(body)}
        />
      ) : (
        preview && (
          <>
            <h2>{preview.title}</h2>
            <p>
              {cards.length}{" "}
              个词。先核对释义和例句，再选择本次要练的词；文件来自AI并不代表内容已审核。
            </p>
            <div className="english-word-list">
              {cards.map((c, i) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={(e) =>
                      setSelected((old) => {
                        const n = new Set(old);
                        if (e.target.checked) n.add(i);
                        else n.delete(i);
                        return n;
                      })
                    }
                  />
                  {c.word}
                </label>
              ))}
            </div>
            <div className="english-card">
              <figure>
                <img src={cards[index].image!} alt="所选词包的配图" />
              </figure>
              <div className="english-card-text">
                <h2>{cards[index].word}</h2>
                <p>
                  {cards[index].ipa} {cards[index].pos}
                </p>
                <p>{cards[index].en}</p>
                <blockquote>{cards[index].example}</blockquote>
                <button onClick={() => speech.speak(cards[index].word)}>
                  听单词
                </button>
                <div className="english-card-controls">
                  <button
                    disabled={index === 0}
                    onClick={() => setIndex((i) => i - 1)}
                  >
                    上一张
                  </button>
                  <button
                    disabled={index === cards.length - 1}
                    onClick={() => setIndex((i) => i + 1)}
                  >
                    下一张
                  </button>
                </div>
                <button className="english-primary" onClick={begin}>
                  确认所选词，开始本次训练
                </button>
              </div>
            </div>
            <p role="status">{speech.message}</p>
          </>
        )
      )}
    </section>
  );
}
