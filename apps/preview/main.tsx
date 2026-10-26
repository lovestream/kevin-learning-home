import Practice from "./practice/Practice.tsx";
import { contentDigest } from "./integrity.ts";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  catalogSchema,
  fullLessonSchema,
  canonical,
  type Catalog,
  type FullLesson,
} from "./contract.ts";
import { Exploration, adapterFor } from "./registry.tsx";
import { CatalogPage, MapBreadcrumb } from "./MapNavigation.tsx";
import {
  validateLearningMap,
  lessonLocation,
  neighborLessons,
  type LearningMap,
} from "./learning-map.ts";
import type {
  WidgetState,
  MeasurementTaskDiagram,
} from "./adapters/source/src/studio/types.ts";
import IntroVisual from "./adapters/source/src/studio/IntroVisual.tsx";
import MathSceneVisual from "./adapters/source/src/studio/MathSceneVisual.tsx";
import TaskDiagram from "./adapters/source/src/studio/measurement/TaskDiagram.tsx";
import { TeachingDiagram } from "./adapters/source/src/studio/TeachingDiagrams.tsx";
import { currentClassroomExperiment } from "./adapters/source/shared/classroom-expression.mjs";
import {
  mixedSceneContext,
  coreSceneMission,
} from "./adapters/source/shared/scene-context.mjs";
import "../web/src/style.css";
import "./adapters/source/src/studio/teaching.css";
import "../web/src/math/math.css";
import "./preview.css";
const trackLabels: Record<string, string> = {
  foundation: "基础 B",
  enhancement: "提高 E",
  olympiad: "思维 O",
};
const trackLabel = (track: string) => trackLabels[track] ?? track;
const templates = [
  "template-cube-1.svg",
  "template-cube-2.svg",
  "template-cube-3.svg",
  "template-rectangular-box.svg",
];
function ContextPicture({
  lesson,
  prediction = false,
}: {
  lesson: FullLesson;
  prediction?: boolean;
}) {
  const spec = prediction ? lesson.predictionVisual : lesson.storyVisual;
  if (spec) return <IntroVisual spec={spec} prediction={prediction} />;
  if (lesson.contextDiagram)
    return <TeachingDiagram kind={lesson.contextDiagram} />;
  if (lesson.mathScenes[0])
    return (
      <figure data-intro-visual="math-scene">
        <MathSceneVisual scene={lesson.mathScenes[0]} step={0} />
        <figcaption>只展示原故事的已知条件，过程与结果由你探索。</figcaption>
      </figure>
    );
  const s = lesson.lengthScenes[0];
  if (!s) throw Error("CONTEXT_VISUAL_REQUIRED");
  const diagram: MeasurementTaskDiagram = {
    type: "measurement",
    mode: s.mode,
    pieceLengthMm: s.pieceLengthsMm?.[0],
    pieceLengthsMm: s.pieceLengthsMm,
    overlapsMm: s.overlapsMm,
    thicknessMm: s.thicknessMm,
    count: s.count,
    startMm: s.startMm,
    endMm: s.endMm,
    lengthMm: s.endMm,
    spacingMm: s.spacingMm,
    closed: s.closed,
    caption: s.prompt,
  };
  if (s.mode === "route" && s.spacingMm && s.endMm)
    diagram.sectionLengthsMm = Array.from(
      { length: s.endMm / s.spacingMm },
      () => s.spacingMm!,
    );
  return (
    <div data-intro-visual={"length-" + s.mode}>
      <TaskDiagram diagram={diagram} intro />
    </div>
  );
}
function Lesson({
  lesson,
  catalog,
  map,
}: {
  lesson: FullLesson;
  catalog: Catalog;
  map: LearningMap;
}) {
  const neighbors = neighborLessons(map, catalog, lesson.lessonId);
  const currentUnit = lessonLocation(map, lesson.lessonId);
  const [step, setStep] = useState(0),
    [prediction, setPrediction] = useState(""),
    [thought, setThought] = useState(""),
    [value, setValue] = useState<WidgetState>({}),
    [revision, setRevision] = useState(0);
  const stage = useRef<HTMLDivElement>(null),
    staticOnly = lesson.interactionStatus === "static-visual",
    c = lesson.classroom;
  const steps = [
    "真实问题",
    "先猜一猜",
    staticOnly ? "画图想一想" : "亲手实验",
    "说出发现",
    "写成数学",
    "自己验证",
  ];
  function move(n: number) {
    setStep(n);
    requestAnimationFrame(() => stage.current?.focus());
  }
  const current = currentClassroomExperiment(lesson, value),
    core = lesson.conceptScenes[0]?.textbookSpec;
  const mission = lesson.mathScenes.length
    ? mixedSceneContext(lesson.mathScenes, value.sceneId)?.mission
    : core?.cases
      ? coreSceneMission(core, value)
      : null;
  return (
    <article
      className="math-lesson child-classroom"
      data-lesson-id={lesson.lessonId}
      data-state-revision={revision}
    >
      <header className="math-heading">
        <p>数学课堂 · {lesson.lessonId}</p>
        <h1>{lesson.title}</h1>
        <p>{lesson.subtitle}</p>
        <p className="math-readonly">
          draft 教学预览 · {staticOnly ? "静态关系图与纸笔指导" : "交互教具"} ·
          体验模式不会保存
        </p>
      </header>
      <details className="preview-context">
        <summary>课程单元与推荐先修</summary>
        <p>
          {lesson.textbookUnit?.title ?? lesson.parentUnitId} ·{" "}
          {/-R\d+$/.test(lesson.lessonId) ? "复习 R" : trackLabel(lesson.track)}{" "}
          · {lesson.contentVersion} / {lesson.editorialRevision}
        </p>
        {lesson.recommendedPrerequisites.map((x) => (
          <p key={x}>{x}</p>
        ))}
        <p>{lesson.prerequisiteNote}</p>
      </details>
      <nav className="classroom-route" aria-label="本课六个短步骤">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => move(i)}
            aria-current={step === i ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </nav>
      <div
        className="classroom-stage"
        ref={stage}
        tabIndex={-1}
        aria-label={steps[step]}
      >
        <p className="math-step-count">{step + 1} / 6</p>
        {step === 0 && (
          <section>
            <h2>先看这件事</h2>
            <p className="story-sentence">{c.story}</p>
            <ContextPicture lesson={lesson} />
            <h3>今天的任务</h3>
            <p>{c.mission}</p>
          </section>
        )}
        {step === 1 && (
          <section>
            <h2>{c.predictQuestion}</h2>
            <ContextPicture lesson={lesson} prediction />
            <div className="prediction-cards">
              {c.predictionOptions.map((x) => (
                <button
                  key={x}
                  aria-pressed={prediction === x}
                  onClick={() => setPrediction(x)}
                >
                  {x}
                </button>
              ))}
            </div>
            <label>
              想留一句话？（可不写）
              <input
                maxLength={180}
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                placeholder="也可以口头说给家人听"
              />
            </label>
            <p className="math-memory-note">
              猜想仅留在当前页面，不判分，不保存。
            </p>
          </section>
        )}
        {step === 2 && (
          <section>
            <h2>{steps[2]}</h2>
            <p>{mission ?? c.mission}</p>
            {staticOnly && (
              <p className="preview-static-note">
                本课保留原静态关系图，请指认、画草图或摆实物；这里没有拖动模型。
              </p>
            )}
            {prediction && <p>刚才我的猜想：{prediction}</p>}
            {lesson.lessonId === "G3-L04-B03" && (
              <ContextPicture lesson={lesson} />
            )}
            <Exploration
              lesson={lesson}
              value={value}
              change={(next) => {
                setValue(next);
                setRevision((n) => n + 1);
              }}
            />
          </section>
        )}
        {step === 3 && (
          <section>
            <h2>{c.whyQuestion ?? c.retell}</h2>
            <p>{c.observedEvidence ?? "指着刚才的变化，说给家人听。"}</p>
            <details>
              <summary>需要时展开：回看开头问题的关系</summary>
              {c.discovery.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </details>
            <details>
              <summary>想再验证一下？</summary>
              <p>
                {c.counterexamplePrompt ?? "改变一个条件，原来的关系还成立吗？"}
              </p>
              <button onClick={() => move(2)}>回实验找证据</button>
            </details>
          </section>
        )}
        {step === 4 && (
          <section>
            <h2>把开头的问题翻译成数学语言</h2>
            <div className="symbol-lines">
              {c.symbols.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </div>
            {current ? (
              <section>
                <h3>当前实验条件</h3>
                {current.conditions.map((x) => (
                  <p key={x}>{x}</p>
                ))}
                <p>{current.template}</p>
                <p>{current.relation}</p>
              </section>
            ) : (
              <p>如果改过条件，指着当前图形说出关系。</p>
            )}
            <p>{c.retell}</p>
            <details>
              <summary>再看一个完整例子</summary>
              {lesson.workedExamples.map((e, i) => (
                <section key={i}>
                  <h3>{e.title}</h3>
                  {e.steps.map((s, j) => (
                    <p key={j}>
                      <strong>{s.math}</strong>
                      <br />
                      {s.why}
                    </p>
                  ))}
                </section>
              ))}
            </details>
          </section>
        )}
        {step === 5 && (
          <section>
            <h2>自己验证</h2>
            <p>回到开头的问题，用图、实物或口头说明验证你的发现。</p>
            <p>{c.retell}</p>
            <Practice key={lesson.lessonId + ':' + revision} lessonId={lesson.lessonId} />
            <button onClick={() => move(2)}>回实验再试一次</button>
          </section>
        )}
      </div>
      <footer className="classroom-navigation">
        <button disabled={step === 0} onClick={() => move(step - 1)}>
          上一步
        </button>
        <span>可以随时选择任一步</span>
        <button disabled={step === 5} onClick={() => move(step + 1)}>
          下一步
        </button>
      </footer>
      <p>
        <a data-return-unit href={currentUnit.returnHref}>
          返回{currentUnit.returnTitle}
        </a>
      </p>
      <nav aria-label="相邻课堂" className="preview-neighbors">
        {neighbors.map((item, i) =>
          item ? (
            <a
              key={item.lessonId}
              href={"/subjects/math/lessons/" + item.lessonId}
            >
              {i === 0 ? "上一课" : "下一课"}：{item.title}
            </a>
          ) : (
            <span key={i} />
          ),
        )}
      </nav>
    </article>
  );
}
function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [learningMap, setLearningMap] = useState<LearningMap | null>(null),
    [lesson, setLesson] = useState<FullLesson | null>(null),
    [error, setError] = useState(false);
  const requested = location.pathname.startsWith("/subjects/math/lessons/")
      ? decodeURIComponent(location.pathname.slice(23))
      : location.pathname.startsWith("/lesson/")
        ? decodeURIComponent(location.pathname.slice(8))
        : null,
    print = location.pathname === "/math-paper-folding/print-templates.html";
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    void (async () => {
      const response = await fetch("/preview-api/v1/catalog", {
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw Error("CATALOG_UNAVAILABLE");
      const cat = catalogSchema.parse(await response.json());
      const mapResponse = await fetch("/preview-api/v1/learning-map", {
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!mapResponse.ok) throw Error("LEARNING_MAP_UNAVAILABLE");
      const map = validateLearningMap(await mapResponse.json(), cat);
      if (contentDigest(map) !== cat.navigationSha256)
        throw Error("LEARNING_MAP_HASH_MISMATCH");
      if (requested) {
        const entry = cat.lessons.find((l) => l.lessonId === requested);
        if (!entry) throw Error("UNKNOWN_LESSON");
        const r = await fetch(
          "/preview-api/v1/lessons/" + encodeURIComponent(requested),
          { credentials: "omit", cache: "no-store", signal: controller.signal },
        );
        if (!r.ok) throw Error("LESSON_UNAVAILABLE");
        const data = fullLessonSchema.parse(await r.json());
        if (
          data.lessonId !== requested ||
          contentDigest(data) !== entry.dtoSha256
        )
          throw Error("CONTENT_HASH_MISMATCH");
        adapterFor(data);
        if (alive) setLesson(data);
      }
      if (alive) {
        setCatalog(cat);
        setLearningMap(map);
      }
    })().catch(() => {
      if (alive) {
        setError(true);
        setLesson(null);
        setCatalog(null);
        setLearningMap(null);
      }
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [requested]);
  return (
    <div className="site-shell preview-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="topbar">
        <a className="brand" href="/">
          ⌂ Kevin 学习家园
        </a>
        <span className="role-tag">数学内容体验 · 无需账号</span>
      </header>
      <nav aria-label="学科导航" className="preview-subjects">
        <a href="/subjects/math" aria-current="page">
          数学 · 70课教学
        </a>
        <span aria-disabled="true">英语 · 待迁入</span>
      </nav>
      <p className="preview-banner">
        体验模式不会保存：无真实学习数据、无账号、无成绩记录。刷新或离开课堂会清空本次操作。
      </p>
      <main id="main-content" className="reading-area" tabIndex={-1}>
        {learningMap && (
          <MapBreadcrumb
            map={learningMap}
            id={requested ?? undefined}
            title={lesson?.title}
          />
        )}
        {error ? (
          <section role="alert">
            <h1>课堂暂时无法确认</h1>
            <p>内容或资源校验未通过，请返回目录或联系维护者。</p>
            <a href="/">返回目录</a>
          </section>
        ) : !catalog || !learningMap ? (
          <p role="status">正在摆好课堂…</p>
        ) : print ? (
          <section>
            <h1>等比例折纸模板</h1>
            <p>
              原项目生成的几何模板。点击打开 SVG 后，用浏览器打印，保持 100%
              比例，不缩放适合页面。
            </p>
            {templates.map((name, i) => (
              <figure key={name}>
                <a href={"/math-paper-folding/" + name}>
                  <img
                    src={"/math-paper-folding/" + name}
                    alt={"折纸模板 " + (i + 1)}
                  />
                </a>
              </figure>
            ))}
          </section>
        ) : requested && lesson ? (
          <Lesson
            key={lesson.lessonId}
            lesson={lesson}
            catalog={catalog}
            map={learningMap}
          />
        ) : (
          <CatalogPage catalog={catalog} map={learningMap} />
        )}
      </main>
      <footer className="preview-footer">
        仅三年级当前 70
        课教学与 849 道临时练习；解释题待家长核对。数学侦探、思维卡与高年级尚未迁入。旧网站继续独立运行。
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
