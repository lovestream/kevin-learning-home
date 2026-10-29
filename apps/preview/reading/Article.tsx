import { useEffect, useState } from "react";
import { usePageLearning } from "../PageLearning.tsx";
import { articleSchema, checkpointResult, type Article } from "./contract.ts";
import type { FullLesson } from "../contract.ts";
import type { WidgetState } from "../adapters/source/src/studio/types.ts";
import { Exploration } from "../registry.tsx";
import { TeachingDiagram } from "../adapters/source/src/studio/TeachingDiagrams.tsx";
function Checkpoint({
  block,
  lessonId,
}: {
  block: Article["blocks"][number];
  lessonId: string;
}) {
  const [value, setValue] = useState(""),
    [feedback, setFeedback] = useState<ReturnType<
      typeof checkpointResult.parse
    > | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/preview-api/v1/reading/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          blockId: block.blockId,
          ...(block.responseType === "choice"
            ? { choice: Number(value) }
            : { explanation: value }),
        }),
        credentials: "omit",
        cache: "no-store",
      });
      if (!r.ok) throw Error("这次对照未能完成，请重试；你的输入仍在。");
      setFeedback(checkpointResult.parse(await r.json()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="reading-checkpoint">
      <p>{block.prompt}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={busy}>
          <legend>先自己回答，再对照</legend>
          {block.responseType === "choice" ? (
            <label>
              我的选择
              <select
                required
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setFeedback(null);
                }}
              >
                <option value="">请选择</option>
                {block.options?.map((o, i) => (
                  <option key={i} value={i}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              我的想法
              <textarea
                required
                minLength={2}
                maxLength={240}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setFeedback(null);
                }}
              />
            </label>
          )}
          <button disabled={busy || value.trim() === ""}>
            写好了，对照参考过程
          </button>
        </fieldset>
      </form>
      {error && <p role="alert">{error}</p>}
      {feedback && (
        <section className="learning-feedback" aria-live="polite">
          <h3>
            {feedback.correct === null
              ? "一起核对关系"
              : feedback.correct
                ? "这条依据成立"
                : "再回到条件看看"}
          </h3>
          <p>{feedback.feedback}</p>
          {feedback.reference && <p>{feedback.reference}</p>}
          <a href={"#reading-" + (block.revisit ?? "try")}>回到模型核对</a>
        </section>
      )}
    </div>
  );
}
export default function ReadingArticle({
  lesson,
  onBack,
  onPractice,
}: {
  lesson: FullLesson;
  onBack: () => void;
  onPractice: () => void;
}) {
  const memory = usePageLearning();
  const [article, setArticle] = useState<Article | null>(null),
    [error, setError] = useState(""),
    [widgets, setWidgets] = useState<Record<string, WidgetState>>({}),
    [note, setNote] = useState(""),
    [read, setRead] = useState(!!memory.reading[lesson.lessonId]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/preview-api/v1/reading/" + encodeURIComponent(lesson.lessonId), {
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw Error("教案暂时无法确认。");
        return r.json();
      })
      .then((v) => {
        const a = articleSchema.parse(v);
        if (a.lessonId !== lesson.lessonId) throw Error("教案编号不一致。");
        setArticle(a);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("教案内容或连接未能确认，请重试。");
      });
    return () => controller.abort();
  }, [lesson.lessonId]);
  if (error)
    return (
      <section role="alert">
        <h1>教案暂时无法确认</h1>
        <p>{error}</p>
        <button onClick={onBack}>回到短课堂</button>
      </section>
    );
  if (!article) return <p role="status">正在展开教案…</p>;
  return (
    <article className="reading-article" data-reading-lesson={lesson.lessonId}>
      <header className="module-heading">
        <p className="eyebrow">完整教案 · 可和家长一起读</p>
        <h1>{lesson.title}</h1>
        <p>{lesson.question}</p>
        <p className="session-policy">
          教案保留原教学内容；读到哪里、教具操作和解释仅在本页临时保留。
        </p>
        <div className="action-row">
          <button onClick={onBack}>回到六步短课堂</button>
          <button onClick={() => window.print()}>打印本课教案</button>
          <button onClick={onPractice}>直接做本课练习</button>
        </div>
      </header>
      <nav className="reading-jumps" aria-label="完整教案章节">
        {article.blocks.map((b) => (
          <a key={b.blockId} href={"#reading-" + b.blockId}>
            {b.title}
          </a>
        ))}
        <a href="#reading-retell">讲给家人听</a>
      </nav>
      {article.blocks.map((b) => (
        <section
          className={"reading-block reading-" + b.type}
          id={"reading-" + b.blockId}
          key={b.blockId}
        >
          <h2>{b.title}</h2>
          {b.text && <p>{b.text}</p>}
          {b.paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {b.diagram && b.type !== "checkpoint" && (
            <TeachingDiagram kind={b.diagram} />
          )}{" "}
          {b.widget && (
            <Exploration
              lesson={lesson}
              value={widgets[b.blockId] ?? {}}
              change={(v) => setWidgets((w) => ({ ...w, [b.blockId]: v }))}
            />
          )}
          {b.examples?.map((ex, i) => (
            <details className="reading-example" key={i}>
              <summary>{ex.title} · 展开参考过程</summary>
              <ol>
                {ex.steps.map((s, i) => (
                  <li key={i}>
                    <strong>{s.math}</strong>
                    <p>{s.why}</p>
                  </li>
                ))}
              </ol>
            </details>
          ))}
          {b.cases && (
            <div className="reading-comparisons">
              {b.cases.map((c, i) => (
                <section key={i}>
                  <h3>{c.label}</h3>
                  <p>{c.math}</p>
                  <details>
                    <summary>核对这条说法</summary>
                    <strong>{c.valid ? "关系成立" : "这条说法需要修正"}</strong>
                    <p>{c.explanation}</p>
                  </details>
                </section>
              ))}
            </div>
          )}
          {b.type === "checkpoint" && (
            <Checkpoint block={b} lessonId={lesson.lessonId} />
          )}
          {b.methods?.map((m) => (
            <details className="reading-method" key={m.id}>
              <summary>这个办法有个名字：{m.name}</summary>
              {m.question && <p>{m.question}</p>}
              <p>{m.action}</p>
              <p>适用条件：{m.condition}</p>
              <p>边界与反例：{m.counterexample}</p>
              <a href="/subjects/math/library?kind=methods">去方法工具箱对照</a>
            </details>
          ))}
          {b.type === "practice" && (
            <button onClick={onPractice}>去做这节课的练习</button>
          )}
        </section>
      ))}
      <section id="reading-retell" className="reading-block">
        <h2>讲给家人听</h2>
        <p>{article.retellPrompt}</p>
        <label>
          我发现……
          <textarea
            maxLength={1200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          disabled={!note.trim() || memory.notes.length >= 100}
          onClick={() => {
            memory.note(lesson.lessonId, lesson.title, note);
            setNote("");
          }}
        >
          记在本页
        </button>
        {memory.notes
          .filter((n) => n.lessonId === lesson.lessonId)
          .map((n, i) => (
            <blockquote key={i}>{n.text}</blockquote>
          ))}
        <button
          aria-pressed={read}
          onClick={() => {
            setRead(!read);
            memory.mark(lesson.lessonId, read ? null : "retell");
          }}
        >
          {read ? "本页已标记读过（可取消）" : "标记本页已读"}
        </button>
        <p className="session-policy">
          不会自动判对错或掌握；刷新后本页标记与解释清空。
        </p>
      </section>
    </article>
  );
}
