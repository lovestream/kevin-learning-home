import { PageCommands } from "./commands.ts";
import { eventId } from "./event-id.ts";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  trainingCatalogSchema,
  caseAttemptSchema,
  selfAttemptSchema,
  trainingDataSchema,
  type SelfAttempt,
  type CaseAttempt,
  type TrainingData,
} from "./training-contract.ts";
import DetectiveFigure from "./library/source/DetectiveFigure.tsx";
import "./library/source/model-styles.css";
type Catalog = z.infer<typeof trainingCatalogSchema>;
const id = () => eventId();
const categoryOptions = [
  ["question", "问题与条件"],
  ["units", "单位"],
  ["calculation", "计算"],
  ["relation", "数量关系"],
  ["expression", "表达"],
  ["verification", "检验"],
];
// Adapts the source DetectivePanel ResponseInput: exact ordering strings,
// keyboard movement and drag ordering, and an explicit pending oral response.
function CaseResponse({
  spec,
  value,
  onChange,
}: {
  spec: NonNullable<CaseAttempt["case"]["response"]>;
  value: string;
  onChange: (value: string) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  if (spec.kind === "ordering") {
    const items = value ? value.split("|") : spec.options;
    const move = (from: number, to: number) => {
      if (to < 0 || to >= items.length) return;
      const next = [...items];
      next.splice(to, 0, next.splice(from, 1)[0]);
      onChange(next.join("|"));
    };
    return (
      <>
        <ol className="case-ordering" aria-label="排列你的答案">
          {items.map((item, i) => (
            <li
              key={item}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag !== null) move(drag, i);
                setDrag(null);
              }}
            >
              <span>
                {i + 1}. {item}
              </span>
              <button
                type="button"
                aria-label={item + "上移"}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                上移
              </button>
              <button
                type="button"
                aria-label={item + "下移"}
                disabled={i === items.length - 1}
                onClick={() => move(i, i + 1)}
              >
                下移
              </button>
            </li>
          ))}
        </ol>
        {!value && (
          <button type="button" onClick={() => onChange(items.join("|"))}>
            保留当前排列
          </button>
        )}
      </>
    );
  }
  if (spec.kind === "choice")
    return (
      <label>
        你的选择
        <select
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">请选择</option>
          {spec.options.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
    );
  if (spec.kind === "oral")
    return (
      <label>
        <input
          type="checkbox"
          required
          checked={value === "oral"}
          onChange={(e) => onChange(e.target.checked ? "oral" : "")}
        />
        我已说出理由，等待家长核对
      </label>
    );
  return (
    <label>
      你的答案 {spec.unit}
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
      />
    </label>
  );
}
export default function DetectiveTraining() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [data, setData] = useState<TrainingData | null>(null),
    [caseWork, setCaseWork] = useState<CaseAttempt | null>(null),
    [self, setSelf] = useState<SelfAttempt | null>(null),
    [layer, setLayer] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [family, setFamily] = useState(""),
    [filter, setFilter] = useState("");
  const [collection, setCollection] = useState(""),
    [indexOpen, setIndexOpen] = useState(false);
  const caseFocus = useRef<HTMLHeadingElement>(null);
  const commands = useRef(new PageCommands());
  const capability = useRef(""),
    pending = useRef(false);
  const [answer, setAnswer] = useState(""),
    [reasoning, setReasoning] = useState(""),
    [status, setStatus] = useState("answered"),
    [checkValue, setCheckValue] = useState(""),
    [expression, setExpression] = useState(""),
    [explanation, setExplanation] = useState(""),
    [checkStatus, setCheckStatus] = useState("complete"),
    [step, setStep] = useState(""),
    [reason, setReason] = useState(""),
    [category, setCategory] = useState("");
  async function request(path: string, body: unknown) {
    const r = await fetch("/preview-api/v1/training/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
    });
    const v: unknown = await r.json();
    if (!r.ok)
      throw Object.assign(
        Error(
          z.object({ message: z.string().optional() }).parse(v).message ??
            "临时课堂无法连接，请重试。",
        ),
        { status: r.status },
      );
    return v;
  }
  useEffect(() => {
    let live = true,
      token = "";
    Promise.all([
      fetch("/preview-api/v1/training/catalog", {
        credentials: "omit",
        cache: "no-store",
      }).then((r) => {
        if (!r.ok) throw Error("目录暂时不可用。");
        return r.json();
      }),
      request("start", {}),
    ])
      .then(([c, s]) => {
        const v = z
          .object({ capability: z.string(), data: trainingDataSchema })
          .parse(s);
        token = v.capability;
        if (!live) {
          void request("release", { capability: token });
          return;
        }
        capability.current = token;
        setCatalog(trainingCatalogSchema.parse(c));
        setData(v.data);
      })
      .catch((e) => {
        if (live) setError(String(e.message));
      });
    const release = () => {
      if (token)
        navigator.sendBeacon(
          "/preview-api/v1/training/release",
          new Blob([JSON.stringify({ capability: token })], {
            type: "application/json",
          }),
        );
    };
    window.addEventListener("pagehide", release);
    return () => {
      live = false;
      window.removeEventListener("pagehide", release);
      if (token) void request("release", { capability: token }).catch(() => {});
      capability.current = "";
    };
  }, []);
  async function act(channel: "case" | "self", event: Record<string, unknown>) {
    if (pending.current || !capability.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await commands.current.send(
        channel,
        event,
        (channel, event) =>
          request("event", { capability: capability.current, channel, event }),
      );
      if (channel === "case") {
        setCaseWork(caseAttemptSchema.parse(result));
        if (event.action === "start") {
          setIndexOpen(false);
          requestAnimationFrame(() => caseFocus.current?.focus());
        }
        setAnswer("");
        setStep("");
        setReason("");
        setCategory("");
      } else {
        const a = selfAttemptSchema.parse(result);
        setSelf(a);
        if (event.action === "start") {
          setAnswer("");
          setReasoning("");
          setCheckValue("");
          setExpression("");
          setExplanation("");
          setStatus("answered");
          setCheckStatus("complete");
        }
        if (event.action === "first") {
          setAnswer(a.firstAnswer?.value ?? "");
        }
      }
      setData(
        trainingDataSchema.parse(
          await request("data", { capability: capability.current }),
        ),
      );
    } catch (e) {
      if ((e as { status?: number }).status === 409) {
        try {
          const latest = trainingDataSchema.parse(
            await request("data", { capability: capability.current }),
          );
          setData(latest);
          if (channel === "case") {
            const saved = latest.caseHistory.find(
              (x) => x.attempt.id === event.attemptId,
            );
            if (saved) setCaseWork(saved);
          } else {
            const saved = latest.attempts.find((x) => x.id === event.attemptId);
            if (saved) setSelf(saved);
          }
        } catch {}
      }
      setError(e instanceof Error ? e.message : "提交失败。");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function caseAction(action: string, extra: Record<string, unknown> = {}) {
    if (caseWork)
      void act("case", {
        action,
        attemptId: caseWork.attempt.id,
        expectedRevision: caseWork.attempt.revision,
        ...extra,
      });
  }
  function selfAction(action: string, extra: Record<string, unknown> = {}) {
    if (self)
      void act("self", {
        action,
        attemptId: self.id,
        expectedRevision: self.revision,
        ...extra,
      });
  }
  const selectedCollection = catalog?.collections.find(
    (c) => c.id === collection,
  );
  const visibleCases = (catalog?.cases ?? []).filter(
    (c) =>
      (layer !== 2 || c.stepCount > 1) &&
      (layer !== 3 ||
        !selectedCollection ||
        selectedCollection.caseIds.includes(c.id)) &&
      (c.title + " " + c.family).includes(filter),
  );
  return (
    <article className="training-room" aria-busy={busy}>
      <header className="module-heading">
        <p className="eyebrow">数学小侦探</p>
        <h1>先找依据，再改答案</h1>
        <p>看懂别人的思路，也学会检查自己的第一反应。</p>
        <p className="session-policy">
          匿名模拟题 · 仅在本页临时保留，刷新即清空。没有账户、成绩或积分。
        </p>
      </header>
      <nav className="training-layers" aria-label="四层训练">
        {["判断他人", "找到首错", "变式对照", "自己检查"].map((x, i) => (
          <button
            key={x}
            aria-pressed={layer === i + 1}
            onClick={() => setLayer(i + 1)}
          >
            {String(i + 1).padStart(2, "0")} {x}
          </button>
        ))}
      </nav>
      {error && <p role="alert">{error}</p>}
      {!catalog || !data ? (
        <p role="status">正在摆好案卷…</p>
      ) : layer < 4 ? (
        <>
          <section className="training-intro">
            <h2>
              {layer === 1
                ? "这份做法站得住吗？"
                : layer === 2
                  ? "哪一步最先失去了依据？"
                  : "换个条件，再核对一次"}
            </h2>
            <p>
              {layer === 1
                ? "正确、错误、过程不足，都需要用题目里的条件判断。"
                : layer === 2
                  ? "从第一行往后看。不要因为最终答案不对，就把前面每一步都判错。"
                  : "10 包匿名模拟材料、8 个题族。正确对照题也在目录中，不凭题目名字猜答案。"}
            </p>
            {layer === 3 && (
              <>
                <label>
                  选择变式与对照
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                  >
                    <option value="">全部情境</option>
                    {catalog.collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="action-row">
                  <button
                    disabled={busy || visibleCases.length < 2}
                    onClick={() => {
                      const at = visibleCases.findIndex(
                          (c) => c.id === caseWork?.case.id,
                        ),
                        next = visibleCases[(at + 1) % visibleCases.length];
                      if (next)
                        void act("case", {
                          action: "start",
                          attemptId: id(),
                          caseId: next.id,
                          version: next.version,
                        });
                    }}
                  >
                    对照另一份做法
                  </button>
                  <button
                    disabled={busy || !selectedCollection}
                    onClick={() => {
                      if (selectedCollection) {
                        setFamily(selectedCollection.selfFamily);
                        setLayer(4);
                        void act("self", {
                          action: "start",
                          attemptId: id(),
                          errorFamilyId: selectedCollection.selfFamily,
                          mode: "transfer",
                        });
                      }
                    }}
                  >
                    换已知与所求，自己来试
                  </button>
                </div>
              </>
            )}
            <label>
              筛选案卷
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="例如：单位、平均、绕线"
              />
            </label>
            <details className="case-index" open={indexOpen}>
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setIndexOpen(!indexOpen);
                }}
              >
                选择案卷 · 当前 {visibleCases.length} 宗
              </summary>
              <div>
                {visibleCases.map((c) => (
                  <button
                    key={c.id}
                    data-training-case={c.id}
                    disabled={busy}
                    onClick={() =>
                      void act("case", {
                        action: "start",
                        attemptId: id(),
                        caseId: c.id,
                        version: c.version,
                      })
                    }
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </details>
          </section>
          {!caseWork ? (
            <p className="empty-state">
              从案卷目录选一宗，读条件、看步骤，再做判断。
            </p>
          ) : (
            <section
              className="case-desk"
              data-case-id={caseWork.case.id}
              data-phase={caseWork.attempt.phase}
              data-status={caseWork.attempt.status}
              key={caseWork.attempt.id}
            >
              <h2 ref={caseFocus} tabIndex={-1}>
                {caseWork.case.title}
              </h2>
              <p className="problem-statement">{caseWork.case.prompt}</p>
              <DetectiveFigure visual={caseWork.case.visual} />
              <ol className="case-steps">
                {caseWork.case.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {caseWork.attempt.firstVerdict && (
                <p>
                  首次判断已在本页封存：
                  {{
                    correct: "做法正确",
                    wrong: "有错误",
                    insufficient: "过程不足",
                  }[caseWork.attempt.firstVerdict] ??
                    caseWork.attempt.firstVerdict}
                </p>
              )}
              {caseWork.attempt.status === "parent-review" ? (
                <p className="session-policy">
                  口述证据已在本页封存，需要家长核对；匿名页面不会冒充家长批准或判为独立完成。
                </p>
              ) : caseWork.attempt.phase === "judge" ? (
                <fieldset disabled={busy}>
                  <legend>你的判断</legend>
                  {[
                    ["correct", "做法正确"],
                    ["wrong", "有错误"],
                    ["insufficient", "过程不足，不能定位"],
                  ].map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => caseAction("judge", { value: v })}
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              ) : caseWork.attempt.phase === "evidence" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    caseAction("evidence", {
                      step: step === "" ? null : Number(step),
                      reason: Number(reason),
                      ...(category ? { category } : {}),
                    });
                  }}
                >
                  <fieldset disabled={busy}>
                    <legend>首个可证明的问题在哪里？</legend>
                    <label>
                      步骤
                      <select
                        value={step}
                        onChange={(e) => setStep(e.target.value)}
                      >
                        <option value="">没有错误行 / 原过程不足</option>
                        {caseWork.case.steps.map((s, i) => (
                          <option key={i} value={i}>
                            第 {i + 1} 行：{s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      依据
                      <select
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      >
                        <option value="">请选择</option>
                        {caseWork.case.reasons?.map((r, i) => (
                          <option key={i} value={i}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      观察到的问题类型
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">尚不确定</option>
                        {categoryOptions.map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button>提交依据</button>
                  </fieldset>
                </form>
              ) : ["repair", "verify"].includes(caseWork.attempt.phase) ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    caseAction(caseWork.attempt.phase, { value: answer });
                  }}
                >
                  <fieldset disabled={busy}>
                    <legend>{caseWork.case.response?.question}</legend>
                    {caseWork.case.response && (
                      <CaseResponse
                        key={caseWork.attempt.phase}
                        spec={caseWork.case.response}
                        value={answer}
                        onChange={setAnswer}
                      />
                    )}
                    <button disabled={!answer.trim()}>
                      {caseWork.attempt.phase === "repair"
                        ? "提交修复"
                        : "提交验证"}
                    </button>
                  </fieldset>
                </form>
              ) : (
                <section className="learning-feedback">
                  <h3>结案解释</h3>
                  <p>{caseWork.case.solution}</p>
                  <p>
                    {caseWork.attempt.assisted
                      ? "这次得到过辅助，不算独立证据。"
                      : "保留本次判断与证据，不据此推断永久掌握。"}
                  </p>
                </section>
              )}
              <p role="status">{caseWork.attempt.feedback}</p>
              {caseWork.attempt.phase !== "closed" && (
                <button disabled={busy} onClick={() => caseAction("hint")}>
                  需要提示（记为辅助）
                </button>
              )}
            </section>
          )}
        </>
      ) : (
        <>
          <section className="training-intro">
            <h2>把第一次想法留下来</h2>
            <p>
              先封存首答，再写反查式、亲自算出反查结果，最后才看反馈。改对了与独立检查有证据，是两件事。
            </p>
            <label>
              选择题族
              <select
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                <option value="">请选择</option>
                {data.families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} · {f.focus}
                  </option>
                ))}
              </select>
            </label>
            <div className="action-row">
              {[
                ["practice", "自主解题"],
                ["transfer", "换个情境"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  disabled={busy || !family}
                  onClick={() =>
                    void act("self", {
                      action: "start",
                      attemptId: id(),
                      errorFamilyId: family,
                      mode,
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          {self && (
            <section className="self-desk" key={self.id}>
              <h2>{self.mode === "transfer" ? "新情境" : "自主检查"}</h2>
              <p className="problem-statement">{self.question.prompt}</p>
              {self.firstAnswer && (
                <aside className="sealed-answer">
                  <strong>首次想法已封存</strong>
                  <p>
                    {self.firstAnswer.status === "blank"
                      ? "保留空白"
                      : self.firstAnswer.status === "uncertain"
                        ? "仍不确定："
                        : "答案："}
                    {self.firstAnswer.value} {self.question.unit}
                  </p>
                  <p>{self.firstReasoning}</p>
                </aside>
              )}
              {self.phase === "first" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    selfAction("first", {
                      status,
                      value: status === "blank" ? "" : answer,
                      reasoning,
                    });
                  }}
                >
                  <fieldset disabled={busy}>
                    <legend>先写你现在的想法</legend>
                    <label>
                      作答状态
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="answered">已作答</option>
                        <option value="uncertain">仍不确定</option>
                        <option value="blank">暂时不会，保留空白</option>
                      </select>
                    </label>
                    {status !== "blank" && (
                      <label>
                        首次答案 {self.question.unit}
                        <input
                          value={answer}
                          required={status === "answered"}
                          maxLength={80}
                          onChange={(e) => setAnswer(e.target.value)}
                        />
                      </label>
                    )}
                    <label>
                      我是这样想的
                      <textarea
                        value={reasoning}
                        maxLength={500}
                        onChange={(e) => setReasoning(e.target.value)}
                      />
                    </label>
                    <button>封存首答，开始自查</button>
                  </fieldset>
                </form>
              ) : self.phase === "check" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    selfAction("final", {
                      value: answer,
                      checkValue,
                      checkExpression: expression,
                      checkStatus,
                      explanation,
                    });
                  }}
                >
                  <fieldset disabled={busy}>
                    <legend>反馈前，自己检查一次</legend>
                    <p>{self.question.check?.instruction}</p>
                    <p className="math-expression">
                      {self.question.check?.pattern} → 应回到{" "}
                      {self.question.check?.target} {self.question.check?.unit}
                    </p>
                    <label>
                      自查后的答案 {self.question.unit}
                      <input
                        value={answer}
                        required
                        maxLength={80}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    </label>
                    <label>
                      实际使用的检验式（用 □ 代表答案）
                      <input
                        value={expression}
                        maxLength={160}
                        onChange={(e) => setExpression(e.target.value)}
                        placeholder="不要只抄答案；写出反查关系"
                      />
                    </label>
                    <label>
                      亲自算出的反查结果
                      <input
                        value={checkValue}
                        required
                        maxLength={80}
                        onChange={(e) => setCheckValue(e.target.value)}
                      />
                    </label>
                    <label>
                      检验状态
                      <select
                        value={checkStatus}
                        onChange={(e) => setCheckStatus(e.target.value)}
                      >
                        <option value="complete">已完成检查</option>
                        <option value="uncertain">仍不确定</option>
                      </select>
                    </label>
                    <label>
                      这怎样核对了原题条件？
                      <textarea
                        value={explanation}
                        maxLength={500}
                        onChange={(e) => setExplanation(e.target.value)}
                      />
                    </label>
                    <button>封存自查，查看反馈</button>
                  </fieldset>
                </form>
              ) : (
                <section className="learning-feedback">
                  <h3>反馈</h3>
                  <p>{self.explanation}</p>
                  <p>{self.currentCheckEvidence?.reason}</p>
                  <p>
                    {self.currentCheckEvidence?.eligible
                      ? "本次有独立检查证据。"
                      : "本次尚无充分独立检查证据。"}
                  </p>
                  {self.hintExposure.length > 0 && (
                    <p>本次使用过辅助，不能计作独立完成。</p>
                  )}
                </section>
              )}
              {self.phase !== "feedback" && (
                <div className="help-actions">
                  {[
                    ["hint", "看提示"],
                    ["visual", "画条件图"],
                    ["parent-help", "请家长帮忙"],
                  ].map(([action, label]) => (
                    <button
                      key={action}
                      disabled={busy}
                      onClick={() => selfAction(action)}
                    >
                      {label}（记辅助）
                    </button>
                  ))}
                </div>
              )}
              {self.hintText && <p>{self.hintText}</p>}
              {self.visual && <DetectiveFigure visual={self.visual} />}
            </section>
          )}
          <section className="page-evidence">
            <h2>本页证据</h2>
            <div className="evidence-rates">
              {[
                ["首答正确", data.stats.firstCorrect],
                ["自查后正确", data.stats.afterCheck],
                ["有效自主纠错", data.stats.effectiveCorrection],
                ["迁移检查", data.stats.transfer],
              ].map(([label, raw]) => {
                const r = raw as { numerator: number; denominator: number };
                return (
                  <p key={String(label)}>
                    <strong>
                      {r.denominator
                        ? `${r.numerator} / ${r.denominator}`
                        : "尚无样本"}
                    </strong>
                    <span>{String(label)}</span>
                  </p>
                );
              })}
            </div>
            <p>{data.stats.explanation}</p>
            <details>
              <summary>查看本页已封存作答</summary>
              {data.attempts.map((a) => (
                <button key={a.id} onClick={() => setSelf(a)}>
                  {
                    data.families.find((f) => f.id === a.question.errorFamilyId)
                      ?.title
                  }{" "}
                  ·{" "}
                  {a.phase === "feedback"
                    ? "已反馈"
                    : a.phase === "check"
                      ? "待自查"
                      : "待首答"}
                </button>
              ))}
            </details>
            <p className="session-policy">
              原机制提供 1、3、7、14
              天延迟复测。它需要持久化记录；当前匿名页不跨日保存，也不显示虚构的到期任务。隔离合成测试覆盖该机制，正式账户仍未启用。
            </p>
          </section>
        </>
      )}
    </article>
  );
}
