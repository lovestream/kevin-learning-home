import { PageNotebook } from "../PageLearning.tsx";
import { useEffect, useRef, useState } from "react";
import { canonical, type Catalog } from "../contract.ts";
import { contentDigest } from "../integrity.ts";
import type { LearningMap } from "../learning-map.ts";
import Practice from "../practice/Practice.tsx";
import { checksDefault } from "../practice/contract.ts";
import {
  librarySchema,
  detectiveResultSchema,
  type Library,
  type PublicCase,
  type LegacyEntry,
  type ThinkingEntry,
  type DetectiveResult,
} from "./contract.ts";
import { useThinkingJourney } from "./useThinkingJourney.ts";
import { methodCompanions } from "./method-companions.ts";
import LegacyArticle from "./LegacyArticle.tsx";
import LegacyLab from "./LegacyLab.tsx";
import { modelFor } from "./legacy-models.ts";
import ThinkingFigure from "./source/ThinkingFigure.tsx";
import ThinkingTools from "./source/ThinkingTools.tsx";
import DetectiveFigure from "./source/DetectiveFigure.tsx";
import {
  thinkingToolSpec,
  initialThinkingTool,
  moveThinkingTool,
  type ThinkingToolState,
} from "./source/thinking-tools.mjs";
import "./library.css";
const href = (kind: string, id?: string, grade?: number) =>
  "/subjects/math/library?" +
  new URLSearchParams({
    kind,
    ...(id ? { id } : {}),
    ...(grade ? { grade: String(grade) } : {}),
  });
const worldNames = {
  numbers: "数与运算",
  relations: "数量关系",
  geometry: "几何与度量",
  patterns: "规律",
  logic: "逻辑与推理",
  fractions: "分数与比例",
};
const primaryHref = (id: string) =>
  "/subjects/math/lessons/" + encodeURIComponent(id);
function LegacyStudy({ entry }: { entry: LegacyEntry }) {
  const [full, setFull] = useState(false);
  const [step, setStep] = useState(0),
    [retell, setRetell] = useState("");
  const labels = [
    "核心发现",
    "真实问题",
    "图到数学",
    "动手建模",
    "分层练习",
    "自己复述",
  ];
  if (full)
    return (
      <LegacyArticle
        entry={entry}
        onBack={() => setFull(false)}
        onPractice={() => {
          setFull(false);
          setStep(4);
        }}
      />
    );
  return (
    <article className="math-lesson library-study" data-library-id={entry.id}>
      <header className="math-heading">
        <p>{entry.grade} 年级 · 主题探索</p>
        <h1>{entry.title}</h1>
        <p>{entry.subtitle}</p>
        <p>观察、动手，再解释自己的发现。</p>
      </header>
      <button onClick={() => setFull(true)}>展开完整主题教案</button>
      <nav className="classroom-route" aria-label="旧版课程六步">
        {labels.map((label, i) => (
          <button
            key={label}
            aria-current={step === i ? "step" : undefined}
            onClick={() => setStep(i)}
          >
            {i + 1} {label}
          </button>
        ))}
      </nav>
      <section className="classroom-stage">
        <h2>{labels[step]}</h2>
        {step === 0 && (
          <>
            <p>{entry.essence}</p>
            <p>{entry.concept}</p>
          </>
        )}
        {step === 1 && (
          <>
            <h3>{modelFor(entry.id).problem}</h3>
            <p>{entry.humanNeed}</p>
            <p>{entry.story}</p>
          </>
        )}
        {step === 2 && (
          <>
            <p>{modelFor(entry.id).connection}</p>
            <details>
              <summary>原课程的教学说明</summary>
              <p>{entry.invention}</p>
            </details>
            <p>{entry.discovery}</p>
            <ol>
              {entry.extensionChain.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </>
        )}
        {step === 3 && (
          <div className="legacy-lab" data-legacy-model={entry.lab}>
            <LegacyLab key={entry.id} entry={entry} />
          </div>
        )}
        {step === 4 && (
          <Practice
            lessonId={entry.id}
            apiPrefix="/preview-api/v1/library"
            visibleGroups={["warmup", "core", "transfer", "challenge"]}
          />
        )}
        {step === 5 && (
          <>
            <p>{entry.retellPrompt}</p>
            <label>
              我的临时复述
              <textarea
                maxLength={1000}
                value={retell}
                onChange={(e) => setRetell(e.target.value)}
              />
            </label>
            <p>只在当前页面中，刷新清空；不自动判掌握。</p>
          </>
        )}
      </section>
      <p>
        <a href={href("legacy", undefined, entry.grade)}>
          返回 {entry.grade} 年级旧版课程
        </a>
      </p>
    </article>
  );
}
function ThinkingStudy({
  entry,
  primary,
}: {
  entry: ThinkingEntry;
  primary: Set<string>;
}) {
  const journey = useThinkingJourney(entry.id),
    spec = thinkingToolSpec(entry.id);
  const tool = journey.tool ?? (spec ? initialThinkingTool(spec) : undefined),
    history = journey.history ?? [];
  function act(command: string, index?: number, value?: number) {
    void journey
      .act("tool", {
        command,
        ...(index === undefined ? {} : { index }),
        ...(value === undefined ? {} : { value }),
      })
      .catch(() => {});
  }
  return (
    <article className="math-lesson library-study" data-thinking-id={entry.id}>
      <header className="math-heading">
        <p>
          {entry.originUnit} · {entry.classification}
        </p>
        <h1>{entry.title}</h1>
        <p>{entry.thinkingLabel}</p>
        <p>已审定内容，供亲子一起试学；文字解释待家长核对</p>
      </header>
      <p>{entry.bridgeFromCore}</p>
      <ThinkingFigure card={entry} />
      {spec && (
        <ThinkingTools
          id={entry.id}
          record={{ tool, toolHistory: history }}
          busy={journey.busy}
          onAction={act}
        />
      )}
      {journey.error && <p role="alert">{journey.error}</p>}
      <div className="help-actions">
        {[1, 2, 3].map((level) => (
          <button
            key={level}
            disabled={journey.busy}
            onClick={() => void journey.act("hint", { level }).catch(() => {})}
          >
            提示 {level}（记辅助）
          </button>
        ))}
        <button
          disabled={journey.busy || !journey.work?.firstAnswer}
          onClick={() =>
            void journey.act("solution", { level: 1 }).catch(() => {})
          }
        >
          看参考解释（首答后开放，记辅助）
        </button>
      </div>
      {journey.work?.help.map((h, i) => (
        <blockquote key={i}>{h.text}</blockquote>
      ))}
      {journey.work?.phase === "pendingReview" && (
        <p className="session-policy">
          首次想法、自查与终答已在本页封存，等待家长核对；匿名页面不会批准为独立掌握。
        </p>
      )}
      <Practice
        lessonId={entry.id}
        apiPrefix="/preview-api/v1/library"
        visibleGroups={["core"]}
        initialGroup="core"
        onFirst={journey.first}
        onFinal={journey.final}
        externalBusy={journey.busy}
        finalized={journey.work?.phase === "pendingReview"}
        assisted={!!journey.work?.tool || !!journey.work?.help.length}
      />
      <p>
        {primary.has(entry.parentLessonId) ? (
          <a href={primaryHref(entry.parentLessonId)}>回到对应的六步课堂</a>
        ) : (
          "可返回课本目录，按本章主题自由探索。"
        )}
      </p>
      <p>
        <a href={href("thinking")}>返回 17 张思维卡</a>
      </p>
    </article>
  );
}
type CaseAnswer = {
  verdict: "correct" | "wrong" | "";
  errorStep: number | null;
  reason: string;
  repair: string;
  verify: string;
};
const blankCase = (): CaseAnswer => ({
  verdict: "",
  errorStep: null,
  reason: "",
  repair: "",
  verify: "",
});
function ResponseInput({
  response,
  value,
  onChange,
  prefix,
}: {
  response: PublicCase["repair"];
  value: string;
  onChange: (s: string) => void;
  prefix: string;
}) {
  if (response.kind === "ordering")
    return (
      <fieldset>
        <legend>{response.question}</legend>
        {response.options.map((_, i) => (
          <label key={i}>
            {prefix} 第 {i + 1} 位
            <select
              aria-label={prefix + "第" + (i + 1) + "位"}
              value={value.split("|")[i] ?? ""}
              onChange={(e) => {
                const next = Array.from(
                  { length: response.options.length },
                  (_, j) => value.split("|")[j] ?? "",
                );
                next[i] = e.target.value;
                onChange(next.join("|"));
              }}
            >
              <option value="">请选择</option>
              {response.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
    );
  if (response.kind === "choice")
    return (
      <label>
        {response.question}
        <select
          aria-label={prefix}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">请选择</option>
          {response.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <label>
      {response.question}
      <span className="library-response">
        <input
          aria-label={prefix}
          maxLength={1000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <b>{response.unit}</b>
      </span>
    </label>
  );
}
function DetectiveStudy({ item }: { item: PublicCase }) {
  const [answer, setAnswer] = useState<CaseAnswer>(blankCase),
    [first, setFirst] = useState<CaseAnswer | null>(null),
    [checks, setChecks] = useState([false, false, false]),
    [result, setResult] = useState<DetectiveResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  function edit(p: Partial<CaseAnswer>) {
    setAnswer({ ...answer, ...p });
    setResult(null);
  }
  async function grade() {
    if (!first || !checks.every(Boolean)) return;
    const c = new AbortController();
    pending.current = c;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/preview-api/v1/detective/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        signal: c.signal,
        body: JSON.stringify({
          caseId: item.id,
          firstAnswer: first,
          checks,
          finalAnswer: answer,
        }),
      });
      if (!r.ok) throw Error();
      const out = detectiveResultSchema.parse(await r.json());
      if (out.caseId !== item.id) throw Error();
      if (!c.signal.aborted) setResult(out);
    } catch {
      if (!c.signal.aborted) setError("暂时无法核对，请保留本页输入后重试。");
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }
  const complete = Boolean(
    answer.verdict &&
    answer.reason &&
    answer.repair.trim() &&
    answer.verify.trim() &&
    (answer.verdict === "correct" || answer.errorStep !== null),
  );
  return (
    <article className="math-lesson library-study" data-detective-id={item.id}>
      <header className="math-heading">
        <p>数学小侦探 · 匿名模拟训练</p>
        <h1>{item.title}</h1>
        <p>匿名模拟案卷 · 仅在本页探索，不保存调查记录。</p>
      </header>
      <p className="practice-prompt">{item.prompt}</p>
      <DetectiveFigure visual={item.visual} />
      <h2>先观察模拟学生的做法</h2>
      <ol>
        {item.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <fieldset disabled={busy}>
        <legend>我的独立调查</legend>
        <label>
          这份做法是否正确？
          <select
            aria-label="做法判断"
            value={answer.verdict}
            onChange={(e) =>
              edit({
                verdict: e.target.value as CaseAnswer["verdict"],
                errorStep: null,
              })
            }
          >
            <option value="">先作出我的判断</option>
            <option value="wrong">需要改正</option>
            <option value="correct">做法正确</option>
          </select>
        </label>
        {answer.verdict === "wrong" && (
          <label>
            最先需要改正哪一步？
            <select
              aria-label="首错行"
              value={answer.errorStep ?? ""}
              onChange={(e) =>
                edit({
                  errorStep:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            >
              <option value="">请选择</option>
              {item.steps.map((s, i) => (
                <option key={i} value={i}>
                  第 {i + 1} 步 · {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          判断依据
          <select
            aria-label="判断依据"
            value={answer.reason}
            onChange={(e) => edit({ reason: e.target.value })}
          >
            <option value="">请选择</option>
            {item.reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.text}
              </option>
            ))}
          </select>
        </label>
        <ResponseInput
          response={item.repair}
          value={answer.repair}
          onChange={(repair) => edit({ repair })}
          prefix="改正答案"
        />
        <ResponseInput
          response={item.verify}
          value={answer.verify}
          onChange={(verify) => edit({ verify })}
          prefix="反查答案"
        />
      </fieldset>
      {!first ? (
        <button disabled={!complete} onClick={() => setFirst({ ...answer })}>
          完成独立调查，开始自查
        </button>
      ) : (
        <section className="practice-self-check">
          <h2>先自己核对三件事</h2>
          <p>可以保留首答，也可以修改上方终答；首答仅在本页内存。</p>
          {checksDefault.map((s, i) => (
            <label key={s}>
              <input
                type="checkbox"
                checked={checks[i]}
                disabled={busy}
                onChange={(e) => {
                  setChecks(
                    checks.map((v, j) => (i === j ? e.target.checked : v)),
                  );
                  setResult(null);
                }}
              />
              {s}
            </label>
          ))}
          <button
            disabled={busy || !complete || !checks.every(Boolean)}
            onClick={() => void grade()}
          >
            核对本次调查
          </button>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <section
          role="status"
          data-detective-status={result.status}
          className="practice-feedback"
        >
          <h2>
            {result.status === "correct"
              ? "本次调查核对一致"
              : result.status === "pendingReview"
                ? "待家长核对"
                : "继续找线索"}
          </h2>
          <p>{result.message}</p>
          <details>
            <summary>查看参考过程</summary>
            <p>{result.solution}</p>
            {result.hints?.map((s, i) => (
              <p key={i}>
                线索 {i + 1}：{s}
              </p>
            ))}
          </details>
        </section>
      )}
      <p>
        <button
          disabled={busy}
          onClick={() => {
            setAnswer(blankCase());
            setFirst(null);
            setChecks([false, false, false]);
            setResult(null);
            setError("");
          }}
        >
          重做本次调查
        </button>
      </p>
      <p>
        <a href={href("detective")}>返回模拟案卷目录</a>
      </p>
    </article>
  );
}
export default function LibraryPage({
  catalog,
  map,
}: {
  catalog: Catalog;
  map: LearningMap;
}) {
  const [data, setData] = useState<Library | null>(null),
    [error, setError] = useState(false),
    [query, setQuery] = useState(""),
    [readyOnly, setReadyOnly] = useState(false);
  const params = new URLSearchParams(location.search),
    kind = params.get("kind") ?? "thinking",
    id = params.get("id"),
    grade = Number(params.get("grade") ?? 4),
    primary = new Set(catalog.lessons.map((l) => l.lessonId));
  useEffect(() => {
    const c = new AbortController();
    void (async () => {
      const r = await fetch("/preview-api/v1/library/catalog", {
        signal: c.signal,
        cache: "no-store",
        credentials: "omit",
      });
      if (!r.ok) throw Error();
      const lib = librarySchema.parse(await r.json());
      const runtime = await (
        await fetch("/preview-api/v1/runtime", {
          signal: c.signal,
          cache: "no-store",
          credentials: "omit",
        })
      ).json();
      if ((await contentDigest(lib)) !== runtime.libraryPublicSha256)
        throw Error();
      if (!c.signal.aborted) setData(lib);
    })().catch(() => {
      if (!c.signal.aborted) {
        setData(null);
        setError(true);
      }
    });
    return () => c.abort();
  }, []);
  if (error)
    return (
      <section role="alert">
        <h1>内容暂时无法读取</h1>
        <p>请刷新重试；不会展示未经核对的旧内容。</p>
        <a href="/subjects/math">返回数学目录</a>
      </section>
    );
  if (!data) return <p role="status">正在准备数学探索内容…</p>;
  const visibleMethods = data.methods.filter(
    (m) =>
      (!readyOnly || m.guide) &&
      [m.title, m.observableAction, ...m.applicationStructures]
        .join(" ")
        .includes(query.trim()),
  );
  const entry = data.entries.find((e) => e.id === id),
    item = data.cases.find((c) => c.id === id);
  return (
    <div className="library-page">
      <nav aria-label="数学探索导航" className="library-nav">
        <a href="/subjects/math">课本目录</a>
        <a href={href("thinking")}>思维卡 17</a>
        <a href="/subjects/math/detective">数学侦探 · 四层训练</a>
        <a href={href("legacy")}>四至六年级专题 54</a>
        <a href={href("review")}>复习站</a>
        <a href={href("methods")}>方法工具箱</a>
      </nav>
      {id ? (
        entry?.kind === "legacy" ? (
          <LegacyStudy key={entry.id} entry={entry} />
        ) : entry?.kind === "thinking" ? (
          <ThinkingStudy key={entry.id} entry={entry} primary={primary} />
        ) : item ? (
          <DetectiveStudy key={item.id} item={item} />
        ) : (
          <section role="status">
            <h1>这个条目没有开放</h1>
            <p>请从上方选择已经开放的数学探索。</p>
          </section>
        )
      ) : (
        <>
          {kind === "thinking" && (
            <>
              <h1>17 张思维卡</h1>
              <p>用图和教具说明理由，再和家长核对本次想法。</p>
              <div className="library-grid">
                {data.entries
                  .filter((e): e is ThinkingEntry => e.kind === "thinking")
                  .map((e) => (
                    <a
                      data-thinking-link
                      key={e.id}
                      href={href("thinking", e.id)}
                    >
                      <small>
                        {e.originUnit} · {e.thinkingLabel}
                      </small>
                      <h2>{e.title}</h2>
                      <span>进入思维卡 →</span>
                    </a>
                  ))}
              </div>
            </>
          )}
          {kind === "detective" && (
            <>
              <h1>数学小侦探 · 14 个模拟案卷</h1>
              <p>
                观察做法 → 判断与找首错 → 说理由 → 改正 →
                反查。先独立思考，再自己检查。
              </p>
              <div className="library-grid">
                {data.cases.map((c) => (
                  <a
                    data-detective-link
                    key={c.id}
                    href={href("detective", c.id)}
                  >
                    <h2>{c.title}</h2>
                    <span>开始本次调查 →</span>
                  </a>
                ))}
              </div>
            </>
          )}
          {kind === "legacy" && (
            <>
              <h1>四至六年级旧版探索</h1>
              <p>
                54 节旧版探索、432
                道原练习。按年级和主题自由选择，和家长一起核对。
              </p>
              <nav aria-label="选择旧版年级" className="library-nav">
                {[4, 5, 6].map((g) => (
                  <a
                    aria-current={g === grade ? "page" : undefined}
                    key={g}
                    href={href("legacy", undefined, g)}
                  >
                    {g} 年级 · 18 课
                  </a>
                ))}
              </nav>
              {Object.entries(worldNames).map(([world, title]) => (
                <section key={world}>
                  <h2>{title}</h2>
                  <div className="library-grid">
                    {data.entries
                      .filter(
                        (e): e is LegacyEntry =>
                          e.kind === "legacy" &&
                          e.grade === grade &&
                          e.world === world,
                      )
                      .map((e) => (
                        <a
                          data-legacy-link
                          key={e.id}
                          href={href("legacy", e.id, grade)}
                        >
                          <small>{worldNames[e.world]} · 旧版探索</small>
                          <h3>{e.title}</h3>
                          <p>{e.subtitle}</p>
                        </a>
                      ))}
                  </div>
                </section>
              ))}
            </>
          )}
          {kind === "review" && (
            <>
              <h1>自由复习站</h1>
              <PageNotebook />
              <p>
                三年级原 review 组共 244
                题。自由选课复习，不生成到期日、历史错题或永久掌握标签。
              </p>
              <details className="library-review-unit" open>
                <summary>反过来想：从结果找条件 · 11 道原题</summary>
                <p>从结果找条件，再代回原关系；不增加题目或积分。</p>
                <p>
                  <a href={primaryHref(data.inverseClassroomId)}>
                    先看原逆推课堂
                  </a>
                </p>
                {data.inverse.map((row) => (
                  <p key={row.taskId}>
                    <a
                      data-inverse-link
                      href={
                        primaryHref(row.lessonId) +
                        "?" +
                        new URLSearchParams({
                          practice: row.group,
                          task: row.taskId,
                        })
                      }
                    >
                      {row.title} · 求{row.unknown} · {row.direction}
                    </a>
                  </p>
                ))}
              </details>
              {[
                ...map.units.map((u) => ({
                  id: u.id,
                  title: u.title,
                  lessons: u.sequence,
                })),
                ...map.bridgeGroups.map((b) => ({
                  id: b.id,
                  title: b.title,
                  lessons: b.lessons,
                })),
              ].map((u) => (
                <details className="library-review-unit" key={u.id}>
                  <summary>{u.title}</summary>
                  {u.lessons.map((id) => (
                    <p key={id}>
                      <a
                        data-review-link
                        href={primaryHref(id) + "?practice=review"}
                      >
                        {catalog.lessons.find((l) => l.lessonId === id)
                          ?.title ?? id}{" "}
                        · 进入原复习组
                      </a>
                    </p>
                  ))}
                </details>
              ))}
            </>
          )}
          {kind === "methods" && (
            <>
              <h1>方法工具箱 · 28 个条目</h1>
              <p>
                6 张保留原站完整讲解；22
                张增加条件、例子、反例与对应模型，明确标为本次教学适配。
              </p>
              <label>
                查找数学方法
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={readyOnly}
                  onChange={(e) => setReadyOnly(e.target.checked)}
                />
                只看已有完整讲解
              </label>
              {!visibleMethods.length && (
                <p role="status">没有找到，换个关键词试试。</p>
              )}
              <div className="library-grid">
                {visibleMethods.map((m) => {
                  const guide = m.guide ?? methodCompanions[m.thinkingSkillId];
                  return (
                    <details data-method-card key={m.thinkingSkillId}>
                      <summary>
                        <small>
                          {m.guide ? "原站完整讲解" : "本次教学适配"}
                        </small>
                        <h2>{m.title}</h2>
                        <p>{m.observableAction}</p>
                      </summary>
                      {guide ? (
                        <>
                          <h3>{guide.question}</h3>
                          <dl>
                            <dt>什么时候能用</dt>
                            <dd>{guide.condition}</dd>
                            <dt>为什么成立</dt>
                            <dd>{guide.why}</dd>
                            <dt>例子</dt>
                            <dd>{guide.example}</dd>
                            <dt>反例</dt>
                            <dd>{guide.counterexample}</dd>
                          </dl>
                          {guide.lessonIds
                            .filter(
                              (id) =>
                                primary.has(id) ||
                                data.entries.some((e) => e.id === id),
                            )
                            .map((id) => (
                              <p key={id}>
                                <a
                                  href={
                                    primary.has(id)
                                      ? primaryHref(id)
                                      : href("legacy", id)
                                  }
                                >
                                  到对应课堂试试：
                                  {catalog.lessons.find(
                                    (l) => l.lessonId === id,
                                  )?.title ??
                                    data.entries.find((e) => e.id === id)
                                      ?.title}
                                </a>
                              </p>
                            ))}
                        </>
                      ) : (
                        <p>
                          {m.applicationStructures.join("；")}
                          。完整条件、例子与反例尚待补充。
                        </p>
                      )}
                    </details>
                  );
                })}
              </div>
            </>
          )}
          {!["thinking", "detective", "legacy", "review", "methods"].includes(
            kind,
          ) && <p>请选择上方的数学探索入口。</p>}
        </>
      )}
      <p>
        <a href="/math-paper-folding/print-templates.html">
          打开原折纸打印模板
        </a>
      </p>
    </div>
  );
}
