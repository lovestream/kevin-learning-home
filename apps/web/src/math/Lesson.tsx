import { useEffect, useRef, useState } from "react";
import { request, RequestError } from "../api.ts";
import {
  MATH_LESSON_ID,
  type MathResponse,
} from "../../../../packages/contracts/math-readonly.ts";
import { verifyMathResponse } from "./verify.ts";
import { IntroPicture } from "./BoxCamera.tsx";
import { Workbench, freshExploration } from "./Workbench.tsx";
import "./math.css";
const steps = [
  "真实问题",
  "先猜一猜",
  "亲手实验",
  "说出发现",
  "写成数学",
  "自己验证",
];
export default function MathLesson({
  learnerId,
  onDenied,
}: {
  learnerId: string;
  onDenied: () => void;
}) {
  const [data, setData] = useState<MathResponse | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [screen, setScreen] = useState(0),
    [prediction, setPrediction] = useState(""),
    [exploration, setExploration] = useState(freshExploration);
  const denied = useRef(onDenied);
  denied.current = onDenied;
  useEffect(() => {
    let alive = true,
      pending = false,
      stopped = false;
    let active: AbortController | undefined;
    setData(null);
    setError(false);
    async function refresh() {
      if (!alive || pending || stopped) return;
      pending = true;
      const c = new AbortController();
      active = c;
      const timeout = setTimeout(() => c.abort(), 8000);
      try {
        const value = await request(
          "/api/v1/learners/" +
            learnerId +
            "/subjects/math/lessons/" +
            MATH_LESSON_ID,
          c.signal,
        );
        const dto = await verifyMathResponse(
          value,
          learnerId,
          document.querySelector<HTMLMetaElement>(
            'meta[name="klh-math-visual-sha256"]',
          )?.content ?? "",
        );
        if (alive && !c.signal.aborted) setData((old) => old ?? dto);
      } catch (failure) {
        if (alive) {
          stopped = true;
          setData(null);
          setError(true);
          setScreen(0);
          setPrediction("");
          setExploration(freshExploration());
          if (
            failure instanceof RequestError &&
            [401, 403].includes(failure.status)
          )
            denied.current();
        }
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      alive = false;
      clearInterval(timer);
      active?.abort();
    };
  }, [learnerId, retry]);
  const stage = useRef<HTMLDivElement>(null);
  function move(i: number) {
    setScreen(i);
    requestAnimationFrame(() => stage.current?.focus());
  }
  if (error)
    return (
      <section role="alert">
        <h1>课堂暂时无法确认</h1>
        <p>请重新确认身份或稍后再试。</p>
        <button
          className="button secondary"
          onClick={() => setRetry((x) => x + 1)}
        >
          重新读取课堂
        </button>
      </section>
    );
  if (!data) return <p role="status">正在确认课堂…</p>;
  const l = data.lesson,
    c = l.classroom;
  return (
    <article
      className="math-lesson private-content"
      data-lesson-id={data.lessonId}
      data-learner-id={data.learnerId}
    >
      <header className="math-heading">
        <p>数学课堂</p>
        <h1>{l.title}</h1>
        <p>{l.subtitle}</p>
        <p className="math-readonly">只读预览 · 练习尚未接入</p>
      </header>
      <nav className="classroom-route" aria-label="本课六个短步骤">
        {steps.map((s, i) => (
          <button
            key={s}
            aria-current={screen === i ? "step" : undefined}
            onClick={() => move(i)}
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
        aria-label={steps[screen]}
      >
        <p className="math-step-count">{screen + 1} / 6</p>
        {screen === 0 && (
          <section>
            <h2>先看这件事</h2>
            <p className="story-sentence">{c.story}</p>
            <IntroPicture spec={l.intro} dimensions={l.spatial.dimensions} />
            <h3>今天的任务</h3>
            <p>{c.mission}</p>
          </section>
        )}
        {screen === 1 && (
          <section>
            <h2>{c.predictQuestion}</h2>
            <IntroPicture
              spec={l.predictionIntro}
              prediction
              dimensions={l.spatial.dimensions}
            />
            <div className="prediction-cards">
              {c.predictionOptions.map((v) => (
                <button
                  key={v}
                  aria-pressed={prediction === v}
                  onClick={() => setPrediction(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="math-memory-note">猜想仅留在本页，不判分。</p>
          </section>
        )}
        {screen === 2 && (
          <section>
            <h2>亲手实验</h2>
            <p>{c.mission}</p>
            {prediction && <p>刚才我的猜想：{prediction}</p>}
            <Workbench
              value={exploration}
              change={setExploration}
              dimensions={l.spatial.dimensions}
            />
          </section>
        )}
        {screen === 3 && (
          <section>
            <h2>{c.whyQuestion}</h2>
            <p>{c.observedEvidence}</p>
            <details>
              <summary>需要时展开：回看开头问题的关系</summary>
              {c.discovery.map((v) => (
                <p key={v}>{v}</p>
              ))}
            </details>
            <details>
              <summary>想再验证一下？</summary>
              <p>{c.counterexamplePrompt}</p>
              <button onClick={() => move(2)}>回实验找证据</button>
            </details>
          </section>
        )}
        {screen === 4 && (
          <section>
            <h2>把开头的问题翻译成数学语言</h2>
            <div className="symbol-lines">
              {c.symbols.map((v) => (
                <p key={v}>{v}</p>
              ))}
            </div>
            <p>{c.retell}</p>
          </section>
        )}
        {screen === 5 && (
          <section className="math-exercise-unavailable">
            <h2>练习尚未接入</h2>
            <p>可以回到实验台继续观察，或再讲讲你的发现。</p>
            <button onClick={() => move(2)}>再做实验</button>
          </section>
        )}
      </div>
      <footer className="classroom-navigation">
        <button disabled={screen === 0} onClick={() => move(screen - 1)}>
          上一步
        </button>
        <span>可以随时选择任一步</span>
        <button disabled={screen === 5} onClick={() => move(screen + 1)}>
          下一步
        </button>
      </footer>
    </article>
  );
}
