import { useEffect, useState } from "react";
import { z } from "zod";
import type { LegacyEntry } from "./contract.ts";
import { publicLessonSchema } from "../practice/contract.ts";
import { usePageLearning } from "../PageLearning.tsx";
import LegacyLab from "./LegacyLab.tsx";
import Practice from "../practice/Practice.tsx";
import { useTeachingPrint } from "../reading/usePrint.ts";
const exampleSchema = z.object({
  lessonId: z.string(),
  taskId: z.string(),
  prompt: z.string(),
  hint: z.string(),
  solution: z.string(),
  teachingOnly: z.literal(true),
  persisted: z.literal(false),
});
export default function LegacyArticle({
  entry,
  onBack,
  onPractice,
}: {
  entry: LegacyEntry;
  onBack: () => void;
  onPractice: () => void;
}) {
  useTeachingPrint();
  const [example, setExample] = useState<z.infer<typeof exampleSchema> | null>(
      null,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [checkpoint, setCheckpoint] = useState<{
      id: string;
      group: "warmup" | "core" | "transfer" | "challenge" | "review";
    } | null>(null),
    [text, setText] = useState("");
  const memory = usePageLearning();
  useEffect(() => {
    const c = new AbortController();
    fetch("/preview-api/v1/library/lessons/" + entry.id, {
      signal: c.signal,
      credentials: "omit",
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((v) => {
        const l = publicLessonSchema.parse(v);
        if (l.lessonId !== entry.id) throw Error();
        const groups = [
          "core",
          "warmup",
          "transfer",
          "challenge",
          "review",
        ] as const;
        for (const group of groups) {
          const t = l.taskSets[group].find((t) => t.kind === "choice");
          if (t) {
            setCheckpoint({ id: t.id, group });
            return;
          }
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setError("课堂自查暂时无法确认，请重试。");
      });
    return () => c.abort();
  }, [entry.id]);
  async function reveal() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/preview-api/v1/library/teaching-example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ lessonId: entry.id }),
      });
      if (!r.ok) throw Error();
      const v = exampleSchema.parse(await r.json());
      if (v.lessonId !== entry.id) throw Error();
      setExample(v);
      return true;
    } catch {
      setError("参考过程暂未展开，请重试。");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="reading-article" data-legacy-article={entry.id}>
      <header className="module-heading">
        <p className="eyebrow">{entry.grade} 年级 · 原专题完整教案</p>
        <h1>{entry.title}</h1>
        <p>{entry.whyQuestion}</p>
        <p className="session-policy">
          原课程正文与8题保留，专用模型为本次适配。没有伪造教材册次或学习成绩。
        </p>
        <div className="action-row">
          <button onClick={onBack}>回到六步探索</button>
          <button onClick={onPractice}>做本课8道练习</button>
          <button
            disabled={busy}
            onClick={async () => {
              if (example || (await reveal()))
                requestAnimationFrame(() => window.print());
            }}
          >
            打印本课教案
          </button>
        </div>
      </header>
      <nav className="reading-jumps" aria-label="主题教案章节">
        {[
          ["start", "为什么需要"],
          ["try", "动手建模"],
          ["meaning", "概念与关系"],
          ["example", "一起做一道"],
          ["check", "自己核对"],
          ["retell", "讲给家人听"],
        ].map(([id, label]) => (
          <a key={id} href={"#legacy-reading-" + id}>
            {label}
          </a>
        ))}
      </nav>
      <section className="reading-block" id="legacy-reading-start">
        <h2>生活里遇到了什么问题？</h2>
        <p>{entry.story}</p>
        <p>{entry.humanNeed}</p>
        <p>{entry.essence}</p>
      </section>
      <section className="reading-block" id="legacy-reading-try">
        <h2>动手试试，观察什么改变</h2>
        <p>{entry.discovery.replace(/^数学思想：/, "")}</p>
        <LegacyLab entry={entry} />
      </section>
      <section className="reading-block" id="legacy-reading-meaning">
        <h2>把发现说成数学关系</h2>
        <p>{entry.concept}</p>
        <p>{entry.takeaway}</p>
        <details>
          <summary>原课程的教学说明</summary>
          <p>{entry.invention}</p>
          <ol>
            {entry.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      </section>
      <section className="reading-block" id="legacy-reading-example">
        <h2>一起做一道，说清楚为什么</h2>
        <p>
          先在上面的模型里改变条件，再展开原课的第一道非选择例题。参考过程不计为你的独立作答。
        </p>
        <button disabled={busy} onClick={() => void reveal()}>
          展开原课例题与参考过程
        </button>
        {example && (
          <section className="learning-feedback">
            <h3>{example.prompt}</h3>
            <p>{example.hint}</p>
            <p>{example.solution}</p>
          </section>
        )}
      </section>
      {error && <p role="alert">{error}</p>}
      <section className="reading-block" id="legacy-reading-check">
        <h2>轮到你来核对</h2>
        <p>沿用原课的一道选择题。先留下答案，再自查；解释仍需自己说清。</p>
        {checkpoint && (
          <Practice
            key={checkpoint.id}
            lessonId={entry.id}
            apiPrefix="/preview-api/v1/library"
            visibleGroups={[checkpoint.group]}
            initialGroup={checkpoint.group}
            taskSelection={[checkpoint.id]}
          />
        )}
      </section>
      <section className="reading-block">
        <h2>这个办法还能帮我们想什么？</h2>
        <ol>
          {entry.extensionChain.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>
      <section className="reading-block" id="legacy-reading-retell">
        <h2>讲给家人听</h2>
        <p>{entry.retellPrompt}</p>
        <label>
          我的解释
          <textarea
            value={text}
            maxLength={1200}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button
          disabled={!text.trim() || memory.notes.length >= 100}
          onClick={() => {
            memory.note(entry.id, entry.title, text);
            setText("");
            memory.mark(entry.id, "retell");
          }}
        >
          记在本页
        </button>
        {memory.notes
          .filter((n) => n.lessonId === entry.id)
          .map((n, i) => (
            <blockquote key={i}>{n.text}</blockquote>
          ))}
        <p className="session-policy">
          仅本页临时保留，刷新清空，不自动判掌握。
        </p>
      </section>
    </article>
  );
}
