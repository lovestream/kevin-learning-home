import {
  withdrawnLessons,
  withdrawnTaskIds,
} from "../../../packages/math-training/source/shared/withdrawn-checks.mjs";
import { usePracticeJourney } from "./usePracticeJourney.ts";
import { usePageLearning } from "../PageLearning.tsx";
import { useEffect, useRef, useState } from "react";
import {
  groups,
  groupNames,
  publicLessonSchema,
  resultSchema,
  checksDefault,
  type PracticeLesson,
  type PublicTask,
  type PracticeResult,
} from "./contract.ts";
import TaskDiagram from "../adapters/source/src/studio/measurement/TaskDiagram.tsx";
import InverseTaskFigure from "./InverseTaskFigure.tsx";
import ConceptTaskDiagram from "./ConceptVisual.tsx";
type Answer = Record<string, string>;
type Attempt = {
  answer: Answer;
  first?: Answer;
  checks: boolean[];
  result?: PracticeResult;
};
function readableAnswer(task: PublicTask, answer: Answer) {
  if (task.kind === "choice")
    return [
      task.options?.find((x) => x.id === answer.value)?.text ?? answer.value,
      task.responseSpec.evidenceOptions?.find((x) => x.id === answer.evidence)
        ?.text,
    ]
      .filter(Boolean)
      .join("；");
  if (task.fields)
    return task.fields
      .map((f) => `${f.label}：${answer[f.key] ?? ""}${f.unit ?? ""}`)
      .join("；");
  return `${answer.value ?? ""}${task.unit ?? ""}`;
}
const empty = (): Attempt => ({ answer: {}, checks: [false, false, false] });
function AnswerInput({
  task,
  value,
  onChange,
}: {
  task: PublicTask;
  value: Answer;
  onChange: (a: Answer) => void;
}) {
  if (task.kind === "explanation")
    return (
      <label>
        我的解释
        <textarea
          aria-label="我的解释"
          maxLength={200}
          value={value.value ?? ""}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
          placeholder="说出结论、关键一步，以及为什么"
        />
      </label>
    );
  if (task.kind === "choice")
    return (
      <>
        {[
          { name: "我的选择", key: "value", options: task.options },
          ...(task.responseSpec.type === "claim-evidence"
            ? [
                {
                  name: "支持结论的证据",
                  key: "evidence",
                  options: task.responseSpec.evidenceOptions,
                },
              ]
            : []),
        ].map((set) => (
          <fieldset key={set.key}>
            <legend>{set.name}</legend>
            {set.options?.map((o, i) => (
              <label key={o.id} className="practice-option">
                <input
                  type="radio"
                  name={task.id + "-" + set.key}
                  checked={value[set.key] === o.id}
                  onChange={() => onChange({ ...value, [set.key]: o.id })}
                />
                <span>
                  {String.fromCharCode(65 + i)} · {o.text}
                </span>
              </label>
            ))}
          </fieldset>
        ))}
      </>
    );
  return (
    <div className="practice-fields">
      {(
        task.fields ?? [
          {
            key: "value",
            label: task.kind === "expression" ? "我的算式" : "我的答案",
            unit: task.unit,
          },
        ]
      ).map((f) => (
        <label key={f.key}>
          {f.label}
          <span>
            <input
              aria-label={f.label}
              maxLength={160}
              value={value[f.key] ?? ""}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              placeholder={
                task.kind === "expression"
                  ? "写完整算式，可用 × ÷ 和括号"
                  : "整数、小数或分数，如 3/8"
              }
            />
            {f.unit && <strong>{f.unit}</strong>}
          </span>
        </label>
      ))}
    </div>
  );
}
export default function Practice({
  lessonId,
  apiPrefix = "/preview-api/v1/practice",
  visibleGroups = groups,
  initialGroup,
  onFirst,
  onFinal,
  externalBusy = false,
  finalized = false,
  assisted = false,
  taskSelection,
}: {
  lessonId: string;
  apiPrefix?: "/preview-api/v1/practice" | "/preview-api/v1/library";
  visibleGroups?: readonly (typeof groups)[number][];
  initialGroup?: (typeof groups)[number];
  onFirst?: (
    answer: Record<string, string>,
  ) => Promise<void | Record<string, string>>;
  onFinal?: (
    answer: Record<string, string>,
    checks: boolean[],
  ) => Promise<void>;
  externalBusy?: boolean;
  finalized?: boolean;
  assisted?: boolean;
  taskSelection?: readonly string[];
}) {
  const withdrawn =
    new URLSearchParams(location.search).get("assessment") === "withdrawn-v1" &&
    withdrawnLessons.includes(lessonId);
  const groupsShown = withdrawn ? (["core"] as const) : visibleGroups;
  const pageLearning = usePageLearning();
  const journey = usePracticeJourney(lessonId, !onFirst);
  const [lesson, setLesson] = useState<PracticeLesson | null>(null),
    [group, setGroup] = useState<(typeof groups)[number]>(() => {
      const q = new URLSearchParams(location.search).get(
        "practice",
      ) as (typeof groups)[number];
      return (
        initialGroup ??
        (groupsShown.includes(q) ? q : (groupsShown[0] ?? "warmup"))
      );
    }),
    [index, setIndex] = useState(0),
    [attempts, setAttempts] = useState<Record<string, Attempt>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null),
    generation = useRef(0),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const c = new AbortController();
    void fetch(apiPrefix + "/lessons/" + encodeURIComponent(lessonId), {
      credentials: "omit",
      cache: "no-store",
      signal: c.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        let data = publicLessonSchema.parse(await r.json());
        if (withdrawn) {
          const ids = withdrawnTaskIds(lessonId),
            all = Object.values(data.taskSets).flat(),
            core = ids.map((id) => all.find((t) => t.id === id));
          if (core.some((t) => !t)) throw Error("WITHDRAWN_TASK_MISSING");
          data = {
            ...data,
            taskSets: { ...data.taskSets, core: core as PublicTask[] },
          };
        }
        if (data.lessonId !== lessonId) throw Error();
        if (taskSelection)
          data = {
            ...data,
            taskSets: Object.fromEntries(
              Object.entries(data.taskSets).map(([g, tasks]) => [
                g,
                tasks.filter((t) => taskSelection.includes(t.id)),
              ]),
            ) as PracticeLesson["taskSets"],
          };
        if (!c.signal.aborted) {
          setLesson(data);
          const taskId = new URLSearchParams(location.search).get("task");
          if (taskId) {
            const q = new URLSearchParams(location.search).get(
                "practice",
              ) as (typeof groups)[number],
              g =
                initialGroup ??
                (groupsShown.includes(q) ? q : (groupsShown[0] ?? "warmup")),
              n = data.taskSets[g].findIndex((t) => t.id === taskId);
            if (n < 0) setError("原题链接暂时无法确认，请从本组重新选择。");
            else {
              setGroup(g);
              setIndex(n);
            }
          }
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setError("练习暂时无法读取，请刷新重试。");
      });
    return () => {
      c.abort();
      pending.current?.abort();
      generation.current++;
    };
  }, [lessonId, apiPrefix]);
  if (!lesson) return <p role="status">{error || "正在准备本课练习…"}</p>;
  const tasks = lesson.taskSets[group],
    task = tasks[index],
    attempt = task ? (attempts[task.id] ?? empty()) : empty();
  function update(a: Attempt) {
    if (task) setAttempts((prev) => ({ ...prev, [task.id]: a }));
  }
  function navigate(g: typeof group, n: number) {
    pending.current?.abort();
    generation.current++;
    setBusy(false);
    setError("");
    setGroup(g);
    setIndex(n);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit() {
    if (!task || !attempt.first || !attempt.checks.every(Boolean)) return;
    const c = new AbortController();
    pending.current = c;
    const run = ++generation.current;
    setBusy(true);
    setError("");
    try {
      if (onFinal) await onFinal(attempt.answer, attempt.checks);
      else
        await journey.run(
          group,
          task.id,
          "final",
          attempt.answer,
          task.selfCheckItems ?? checksDefault,
          "hint",
          withdrawn,
        );
      const r = await fetch(apiPrefix + "/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        signal: c.signal,
        body: JSON.stringify({
          lessonId,
          contentVersion: lesson!.contentVersion,
          taskId: task.id,
          firstAnswer: attempt.first,
          checks: attempt.checks,
          finalAnswer: attempt.answer,
        }),
      });
      if (!r.ok) throw Error();
      const result = resultSchema.parse(await r.json());
      if (result.taskId !== task.id) throw Error();
      if (run === generation.current) {
        update({ ...attempt, result });
        pageLearning.record({
          lessonId,
          taskId: task.id,
          group,
          prompt: task.prompt,
          first: attempt.first,
          answer: attempt.answer,
          firstText: readableAnswer(task, attempt.first),
          answerText: readableAnswer(task, attempt.answer),
          status: result.status,
          message: result.message,
          source:
            apiPrefix === "/preview-api/v1/practice" ? "primary" : "library",
        });
      }
    } catch {
      if (!c.signal.aborted && run === generation.current)
        setError("暂时无法核对；你的本次输入仍在页面中，请重试。");
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }
  return (
    <section className="practice-panel" data-practice-lesson={lessonId}>
      <p className="practice-notice">
        {withdrawn
          ? "撤去教具五题 · 先留首答再自查，解释由家长核对"
          : "本页临时作答，刷新清空 · 不记成绩或积分"}
      </p>
      <nav aria-label="五组练习" className="practice-groups">
        {groupsShown.map((g) => (
          <button
            key={g}
            data-practice-group={g}
            aria-pressed={g === group}
            onClick={() => navigate(g, 0)}
          >
            {groupNames[g]} <small>{lesson.taskSets[g].length} 题</small>
          </button>
        ))}
      </nav>
      {!task ? (
        <p>原题库本组没有题目，请自由选择其它题组。</p>
      ) : (
        <>
          <h3 ref={heading} tabIndex={-1}>
            {groupNames[group]} · 第 {index + 1} / {tasks.length} 题
          </h3>
          <nav aria-label="本组题目" className="practice-numbers">
            {tasks.map((t, i) => (
              <button
                key={t.id}
                data-practice-task={t.id}
                aria-current={i === index ? "step" : undefined}
                onClick={() => navigate(group, i)}
              >
                {i + 1}
              </button>
            ))}
          </nav>
          <article
            className="practice-question"
            data-task-id={task.id}
            data-kind={task.kind}
          >
            <p className="practice-prompt">{task.prompt}</p>
            {!withdrawn && task.diagram?.type === "measurement" && (
              <TaskDiagram diagram={task.diagram} />
            )}
            {!withdrawn && task.diagram?.type === "concept" && (
              <ConceptTaskDiagram diagram={task.diagram} />
            )}
            {!withdrawn &&
              (task.diagram?.type === "fraction" ||
                task.diagram?.type === "joined-perimeters") && (
                <InverseTaskFigure diagram={task.diagram} />
              )}
            <fieldset
              disabled={busy || externalBusy || finalized}
              className="practice-answer"
            >
              <legend>
                {assisted || journey.help[task.id]?.length
                  ? "在辅助支持下作答"
                  : "独立作答"}
              </legend>
              <AnswerInput
                task={task}
                value={attempt.answer}
                onChange={(a) =>
                  update({ ...attempt, answer: a, result: undefined })
                }
              />
            </fieldset>
            {!attempt.first ? (
              <button
                disabled={
                  busy ||
                  externalBusy ||
                  (!onFirst && !journey.ready) ||
                  !Object.values(attempt.answer).some((v) => v.trim())
                }
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const sealed = onFirst
                      ? await onFirst(attempt.answer)
                      : await journey.run(
                          group,
                          task.id,
                          "first",
                          attempt.answer,
                          [],
                          "hint",
                          withdrawn,
                        );
                    update({
                      ...attempt,
                      first: { ...(sealed ?? attempt.answer) },
                    });
                  } catch {
                    setError("首答尚未封存；你的输入仍在，请重试。");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                完成首答，开始自查
              </button>
            ) : (
              <section className="practice-self-check">
                <h4>先当一次自己的小老师</h4>
                <p>首答仅在本页保留。可以修改上面的答案，再提交终答。</p>
                <details>
                  <summary>看看我的独立首答</summary>
                  <p>{readableAnswer(task, attempt.first)}</p>
                </details>
                {(task.selfCheckItems ?? checksDefault).map((item, i) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={attempt.checks[i]}
                      onChange={(e) =>
                        update({
                          ...attempt,
                          checks: attempt.checks.map((v, j) =>
                            i === j ? e.target.checked : v,
                          ),
                          result: undefined,
                        })
                      }
                    />
                    {item}
                  </label>
                ))}
                <button
                  disabled={
                    busy || externalBusy || !attempt.checks.every(Boolean)
                  }
                  onClick={() => void submit()}
                >
                  {busy ? "正在核对…" : "提交最终答案"}
                </button>
              </section>
            )}
            {!onFirst && (
              <div className="help-actions">
                {[
                  ["hint", "看提示"],
                  ["article", "回看讲解"],
                  ["solution", "看参考解答"],
                ].map(([kind, label]) => (
                  <button
                    key={kind}
                    disabled={
                      busy ||
                      !journey.ready ||
                      (kind === "solution" && !attempt.first)
                    }
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await journey.run(
                          group,
                          task.id,
                          "help",
                          {},
                          [],
                          kind,
                          withdrawn,
                        );
                      } catch {
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {label}（记辅助）
                  </button>
                ))}
              </div>
            )}
            {journey.help[task.id]?.map((h, i) => (
              <blockquote key={i}>{h.text}</blockquote>
            ))}
            {(error || journey.error) && (
              <p role="alert">{error || journey.error}</p>
            )}
            {attempt.result && (
              <section
                role="status"
                className="practice-feedback"
                data-grade-status={attempt.result.status}
              >
                <h4>
                  {
                    {
                      correct: "本次核对一致",
                      incorrect: "再检查一下",
                      pendingReview: "待家长核对",
                      invalidInput: "请补充或检查输入",
                    }[attempt.result.status]
                  }
                </h4>
                <p>{attempt.result.message}</p>
                {attempt.result.solution && (
                  <details>
                    <summary>查看参考过程与检查依据</summary>
                    <p>{attempt.result.solution}</p>
                    {attempt.result.rubric?.map((x) => (
                      <p key={x}>{x}</p>
                    ))}
                  </details>
                )}
                {attempt.result.hint && (
                  <details>
                    <summary>给我一点提示</summary>
                    <p>{attempt.result.hint}</p>
                    {attempt.result.diagnostic && (
                      <p>{attempt.result.diagnostic}</p>
                    )}
                  </details>
                )}
              </section>
            )}
            <div className="practice-actions">
              <button disabled={busy} onClick={() => update(empty())}>
                重做本题
              </button>
              <button
                disabled={index === 0}
                onClick={() => navigate(group, index - 1)}
              >
                上一题
              </button>
              <button
                disabled={index === tasks.length - 1}
                onClick={() => navigate(group, index + 1)}
              >
                下一题
              </button>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
