import { createContext, useContext, useState, type ReactNode } from "react";
export type PageAttempt = {
  lessonId: string;
  taskId: string;
  group: string;
  prompt: string;
  first: Record<string, string>;
  answer: Record<string, string>;
  firstText: string;
  answerText: string;
  status: "correct" | "incorrect" | "pendingReview" | "invalidInput";
  message: string;
  source: "primary" | "library";
  at: string;
  corrections: number;
};
type Notes = { lessonId: string; title: string; text: string; at: string }[];
type Memory = {
  attempts: PageAttempt[];
  notes: Notes;
  reading: Record<string, string>;
  record: (a: Omit<PageAttempt, "at" | "corrections">) => void;
  note: (lessonId: string, title: string, text: string) => void;
  mark: (lessonId: string, block: string | null) => void;
  clear: () => void;
};
const Context = createContext<Memory>({
  attempts: [],
  notes: [],
  reading: {},
  record: () => {},
  note: () => {},
  mark: () => {},
  clear: () => {},
});
export const usePageLearning = () => useContext(Context);
export function PageLearning({ children }: { children: ReactNode }) {
  const [attempts, setAttempts] = useState<PageAttempt[]>([]),
    [notes, setNotes] = useState<Notes>([]),
    [reading, setReading] = useState<Record<string, string>>({});
  const record: Memory["record"] = (a) =>
    setAttempts((old) => {
      const existing = old.find(
        (x) => x.lessonId === a.lessonId && x.taskId === a.taskId,
      );
      if (!existing && old.length >= 500) return old;
      const row = {
        ...a,
        first: structuredClone(existing?.first ?? a.first),
        firstText: existing?.firstText ?? a.firstText,
        answer: structuredClone(a.answer),
        at: new Date().toISOString(),
        corrections: existing
          ? existing.corrections +
            (existing.status === "incorrect" && a.status === "correct" ? 1 : 0)
          : 0,
      };
      return [...old.filter((x) => x !== existing), row];
    });
  return (
    <Context
      value={{
        attempts,
        notes,
        reading,
        record,
        note: (lessonId, title, text) => {
          if (text.trim() && text.length <= 1200)
            setNotes((n) =>
              n.length >= 100
                ? n
                : [
                    ...n,
                    { lessonId, title, text, at: new Date().toISOString() },
                  ],
            );
        },
        mark: (lessonId, block) =>
          setReading((r) => {
            const next = { ...r };
            if (block === null) delete next[lessonId];
            else next[lessonId] = block;
            return next;
          }),
        clear: () => {
          setAttempts([]);
          setNotes([]);
          setReading({});
        },
      }}
    >
      {children}
    </Context>
  );
}
export function PageNotebook() {
  const m = usePageLearning(),
    wrong = m.attempts.filter((x) => x.status === "incorrect"),
    pending = m.attempts.filter((x) => x.status === "pendingReview"),
    corrected = m.attempts.filter((x) => x.corrections > 0);
  const link = (a: PageAttempt) =>
    (a.source === "primary"
      ? "/subjects/math/lessons/" + a.lessonId
      : "/subjects/math/library?kind=legacy&id=" + a.lessonId) +
    (a.source === "primary" ? "?" : "&") +
    new URLSearchParams({ practice: a.group, task: a.taskId });
  return (
    <section className="page-notebook">
      <h2>本页学习手记</h2>
      <p className="session-policy">
        只汇总这次打开页面后的实际操作。站内导航保留，刷新或关闭后清空；没有跨日历史、成绩或掌握判断。
      </p>
      <div className="evidence-rates">
        <p>
          <strong>{Object.keys(m.reading).length}</strong>
          <span>读过的课堂</span>
        </p>
        <p>
          <strong>{m.attempts.length}</strong>
          <span>已核对的题</span>
        </p>
        <p>
          <strong>{wrong.length}</strong>
          <span>需要再试</span>
        </p>
        <p>
          <strong>{pending.length}</strong>
          <span>口述待核对</span>
        </p>
      </div>
      <h3>错题再试</h3>
      {wrong.length ? (
        wrong.map((a) => (
          <article className="notebook-attempt" key={a.lessonId + a.taskId}>
            <p>{a.prompt}</p>
            <p>首次想法：{a.firstText}</p>
            <p>最近想法：{a.answerText}</p>
            <p>{a.message}</p>
            <a href={link(a)}>回原题核对条件、订正</a>
          </article>
        ))
      ) : (
        <p>当前没有未订正错题。没有作答的题不会算成正确。</p>
      )}
      {corrected.length > 0 && (
        <details>
          <summary>查看本页已订正的题 · {corrected.length}</summary>
          {corrected.map((a) => (
            <p key={a.taskId}>
              {a.prompt} · 首答保留：{a.firstText} → {a.answerText}
              。订正后正确不等于独立掌握。
            </p>
          ))}
        </details>
      )}
      {pending.length > 0 && (
        <details>
          <summary>口述解释待家长核对 · {pending.length}</summary>
          {pending.map((a) => (
            <p key={a.taskId}>
              {a.prompt} · {a.answerText}
            </p>
          ))}
        </details>
      )}
      <h3>我留下的解释</h3>
      {m.notes.length ? (
        m.notes.map((n, i) => (
          <blockquote key={i}>
            <strong>{n.title}</strong>
            <p>{n.text}</p>
          </blockquote>
        ))
      ) : (
        <p>还没有留下解释。可以在完整教案里用自己的话讲一讲。</p>
      )}
      {(m.attempts.length > 0 ||
        m.notes.length > 0 ||
        Object.keys(m.reading).length > 0) && (
        <button onClick={m.clear}>清空本页临时手记</button>
      )}
      {m.attempts.length >= 500 && (
        <p role="status">
          本页已达500题记录上限；已有手记保留，可清空后重新体验。
        </p>
      )}
    </section>
  );
}
