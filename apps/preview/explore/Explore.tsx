import { useRef, useState } from "react";
import {
  firstHypothesis,
  type ExploreEvent,
  type ExploreProject,
  type SubjectRef,
} from "../../../packages/explore/domain.ts";
import {
  deterministicCoach,
  type CoachLevel,
} from "../../../packages/explore/coach.ts";
import { useExplore } from "./memory.tsx";
import type { Catalog } from "../contract.ts";
import "./explore.css";

const tabs = [
  ["questions", "问题库", "把一个为什么留下"],
  ["projects", "正在探索", "试一试，再想一想"],
  ["creations", "我的创造", "让想法变个样子"],
  ["archive", "发现档案", "回头看见想法的变化"],
] as const;
const statusNames = {
  pending: "刚有一个问题",
  active: "正在试一试",
  paused: "先放一放",
  uncertain: "暂时还不知道",
  finished: "有了一个发现",
  archived: "收进发现档案",
};
const originNames = {
  child: "自己提出",
  lesson: "课程引发",
  "parent-suggestion": "家长建议",
  "ai-suggestion": "AI建议",
};
const sourceNames = {
  observed: "亲自看到的",
  reference: "资料说的",
  parent: "家长说明",
  ai: "AI建议的",
};
const eventNames: Record<ExploreEvent["detail"]["kind"], string> = {
  hypothesis_submitted: "我的第一种想法",
  hypothesis_revised: "我改变了想法",
  plan_written: "准备这样试",
  evidence_added: "留下了一条证据",
  claim_written: "现在的看法",
  artifact_created: "一个新创造",
  reflection_written: "回头想一想",
  status_changed: "换一个节奏",
  weekly_selected: "自己选择的重点",
  parent_feedback: "家长的建议",
  help_requested: "主动请求了提示",
};
function go(id: string) {
  // Only an opaque RAM draft/example identifier; never put question text in URLs.
  history.pushState(null, "", "/explore/projects?id=" + encodeURIComponent(id));
  window.dispatchEvent(new PopStateEvent("popstate"));
}
function NotebookPicture() {
  return (
    <svg
      className="curiosity-picture"
      viewBox="0 0 300 240"
      role="img"
      aria-label="纸盒、观察方向和留给自己思考的问号插画"
    >
      <circle cx="155" cy="122" r="103" fill="#def1eb" />
      <path d="M57 163 144 199 243 153 155 119Z" fill="#b7d7cf" />
      <path
        d="m100 79 59-26 59 26-59 30Z"
        fill="#f6c848"
        stroke="#173d43"
        strokeWidth="3"
      />
      <path
        d="M100 79v78l59 31v-79Z"
        fill="#efaa39"
        stroke="#173d43"
        strokeWidth="3"
      />
      <path
        d="M218 79v78l-59 31v-79Z"
        fill="#ffe596"
        stroke="#173d43"
        strokeWidth="3"
      />
      <path
        d="M56 98q-32 41 3 70m-8-15 8 15-16 2M244 178q35-26 17-58m-2 15 2-15 13 7"
        fill="none"
        stroke="#167d7f"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle
        cx="243"
        cy="49"
        r="27"
        fill="white"
        stroke="#167d7f"
        strokeWidth="2"
      />
      <text x="243" y="60" fontSize="34" textAnchor="middle" fill="#173d43">
        ?
      </text>
    </svg>
  );
}
function Composer({
  refs,
  onCreated,
}: {
  refs: SubjectRef[];
  onCreated: (id: string) => void;
}) {
  const [question, setQuestion] = useState(""),
    { create } = useExplore();
  return (
    <form
      className="question-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (question.trim()) onCreated(create(question, refs));
      }}
    >
      <label htmlFor="curiosity-question">我想弄明白的问题</label>
      <textarea
        id="curiosity-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={300}
        placeholder="为什么……？如果换一种办法，会怎样？"
        rows={3}
        required
      />
      <div className="composer-actions">
        <span>可以只留一个问题，不急着找答案。</span>
        <button
          className="explore-primary"
          type="submit"
          disabled={!question.trim()}
        >
          先留下这个问题
        </button>
      </div>
    </form>
  );
}
function ProjectRow({ project }: { project: ExploreProject }) {
  return (
    <article className="question-row" data-project={project.projectId}>
      <span className={"question-mark " + project.status} aria-hidden="true">
        ?
      </span>
      <div>
        <span className="process-label">
          {statusNames[project.status]} ·{" "}
          {project.projectId.startsWith("example-")
            ? "公开示例"
            : "本页临时问题"}
        </span>
        <a
          className="question-title"
          href={"/explore/projects?id=" + project.projectId}
        >
          {project.question}
        </a>
        <small>
          {originNames[project.origin]}
          {firstHypothesis(project) ? " · 已留下最初的想法" : " · 还可以慢慢想"}
        </small>
      </div>
      <span aria-hidden="true" className="row-arrow">
        ↗
      </span>
    </article>
  );
}
function History({ project }: { project: ExploreProject }) {
  return (
    <ol className="explore-history" aria-label="想法变化时间线">
      <li>
        <b>先有一个问题</b>
        <p>{project.question}</p>
        <small>{originNames[project.origin]}</small>
      </li>
      {project.events.map((event) => {
        const d = event.detail;
        return (
          <li key={event.eventId} data-event-kind={d.kind}>
            <b>{eventNames[d.kind]}</b>
            {"text" in d && <p>{d.text}</p>}
            {d.kind === "evidence_added" && (
              <>
                <span className={"source-badge " + d.source}>
                  {sourceNames[d.source]}
                </span>
                {d.citation && <p>出处：{d.citation}</p>}
                {d.inference && <p>我的解释：{d.inference}</p>}
              </>
            )}
            {d.kind === "status_changed" && <p>{statusNames[d.status]}</p>}
            {d.kind === "weekly_selected" && (
              <p>
                {d.selected ? "想把这个问题多想一会儿" : "重新选一个也可以"}
              </p>
            )}
            {d.kind === "artifact_created" && (
              <p>
                {d.fictional ? "想象作品，不是现实观察证据" : "作品文字说明"}
              </p>
            )}
            {d.kind === "help_requested" && <p>离线引导 · {d.level}</p>}
            <small>
              {"assistance" in d
                ? {
                    none: "自己表达",
                    parent: "有家长帮助",
                    ai: "参考了AI建议",
                  }[d.assistance]
                : event.actor === "parent"
                  ? "家长留言"
                  : "自己选择"}
            </small>
          </li>
        );
      })}
    </ol>
  );
}
const stages = [
  ["thought", "我的想法"],
  ["evidence", "观察与证据"],
  ["revise", "新的看法"],
  ["creation", "我的创造"],
  ["history", "过程回看"],
] as const;
function Workspace({
  project,
  catalog,
}: {
  project: ExploreProject;
  catalog: Catalog;
}) {
  const { append } = useExplore(),
    [stage, setStage] = useState<string>("thought"),
    [value, setValue] = useState(""),
    [inference, setInference] = useState(""),
    [citation, setCitation] = useState(""),
    [source, setSource] = useState<"observed" | "reference" | "parent" | "ai">(
      "observed",
    ),
    [assistance, setAssistance] = useState<"none" | "parent" | "ai">("none"),
    [message, setMessage] = useState(""),
    [prompt, setPrompt] = useState(""),
    [certainty, setCertainty] = useState<
      "supported" | "uncertain" | "disproved"
    >("uncertain"),
    [category, setCategory] = useState<
      "model" | "diagram" | "story" | "design" | "experiment"
    >("model"),
    [fictional, setFictional] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    drafts = useRef<Record<string, string>>({}),
    first = firstHypothesis(project),
    evidence = project.events.filter((e) => e.detail.kind === "evidence_added");
  function commit(detail: ExploreEvent["detail"]) {
    try {
      append(project.projectId, detail);
      setValue("");
      setInference("");
      setCitation("");
      setMessage("已留在本页，刷新后不保留。");
    } catch {
      setMessage("这一步还不能留下，请检查首猜、证据和资料出处，再试一次。");
    }
  }
  function changeStage(id: string) {
    drafts.current[stage] = value;
    setStage(id);
    setValue(drafts.current[id] ?? "");
    setMessage("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  function help(level: CoachLevel) {
    setPrompt(deterministicCoach.respond(project, level).text);
    if (first) {
      try {
        append(project.projectId, { kind: "help_requested", level });
      } catch {
        setMessage(
          "本页临时记录已到上限，先在过程回看里查看已有内容；也可以清空后重新试用。",
        );
      }
    }
  }
  return (
    <section
      className="explore-workbench"
      data-explore-project={project.projectId}
    >
      <header className="project-heading">
        <a href="/explore/questions">回到问题库</a>
        <span>
          {project.projectId.startsWith("example-")
            ? "公开示例，可以在本页试着改"
            : "你的临时问题，仅留在本页"}
        </span>
        <h1>{project.question}</h1>
        <p>
          {originNames[project.origin]} · {statusNames[project.status]}
          。可以跳着做、暂停，也可以暂时不知道。
        </p>
      </header>
      <div className="project-controls">
        <label>
          现在的节奏
          <select
            aria-label="现在的节奏"
            value={project.status}
            onChange={(e) =>
              commit({
                kind: "status_changed",
                status: e.target.value as ExploreProject["status"],
              })
            }
          >
            {Object.entries(statusNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => commit({ kind: "weekly_selected", selected: true })}
        >
          本周想多想想这个
        </button>
        <span>只是自己选，不是必须完成。</span>
      </div>
      <nav className="explore-stages" aria-label="探索工作台">
        {stages.map(([id, title]) => (
          <button
            key={id}
            aria-pressed={stage === id}
            onClick={() => changeStage(id)}
          >
            {title}
          </button>
        ))}
      </nav>
      <div className="workbench-grid">
        <div className="workbench-page">
          <h2 tabIndex={-1} ref={heading}>
            {stages.find((s) => s[0] === stage)?.[1]}
          </h2>
          {stage === "history" ? (
            <History project={project} />
          ) : (
            <>
              {first && (
                <blockquote className="first-thought">
                  <span>最初的想法，留着不覆盖</span>
                  <p>
                    {first.detail.kind === "hypothesis_submitted"
                      ? first.detail.text
                      : ""}
                  </p>
                </blockquote>
              )}
              <p>
                {stage === "thought"
                  ? first
                    ? "接下来准备怎么试？只改一个条件，看看会怎样。"
                    : "先说说自己的猜想。“我还不知道”也是一个真实的起点。"
                  : stage === "evidence"
                    ? "把看到的事实和自己的解释分开。失败的结果也值得留下。"
                    : stage === "revise"
                      ? "哪条证据让你改变了想法？还不能确定，也可以。"
                      : "可以写故事、画设计的文字说明，或者记录模型怎么改。不要求每次都有作品。"}
              </p>
              {stage === "evidence" && (
                <>
                  <label>
                    这条信息从哪里来？
                    <select
                      value={source}
                      onChange={(e) =>
                        setSource(e.target.value as typeof source)
                      }
                    >
                      {Object.entries(sourceNames).map(([id, title]) => (
                        <option key={id} value={id}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {source !== "observed" && (
                    <label>
                      资料或帮助的出处
                      <input
                        value={citation}
                        onChange={(e) => setCitation(e.target.value)}
                        maxLength={400}
                      />
                    </label>
                  )}
                </>
              )}
              <label htmlFor="explore-work-text">
                {stage === "thought"
                  ? first
                    ? "我的验证计划"
                    : "我的第一种想法"
                  : stage === "evidence"
                    ? "观察事实或资料原意"
                    : stage === "revise"
                      ? "现在我这样想"
                      : "我的作品说明"}
              </label>
              <textarea
                id="explore-work-text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={2400}
                placeholder={
                  stage === "thought" && !first
                    ? "我猜…… / 我还不知道，但想先……"
                    : "用自己的话留下一小步。"
                }
              />
              {stage === "evidence" && (
                <label>
                  我的解释（和事实分开，可不填）
                  <textarea
                    value={inference}
                    onChange={(e) => setInference(e.target.value)}
                    maxLength={1200}
                  />
                </label>
              )}
              {stage === "revise" && (
                <label>
                  我有多确定？
                  <select
                    value={certainty}
                    onChange={(e) =>
                      setCertainty(e.target.value as typeof certainty)
                    }
                  >
                    <option value="uncertain">证据还不够，暂时不知道</option>
                    <option value="disproved">原来的猜想被推翻了</option>
                    <option value="supported">目前证据支持这个解释</option>
                  </select>
                </label>
              )}
              {stage === "creation" && (
                <>
                  <label>
                    我想做什么
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as typeof category)
                      }
                    >
                      <option value="model">模型</option>
                      <option value="diagram">图解</option>
                      <option value="story">故事</option>
                      <option value="design">设计草图</option>
                      <option value="experiment">实验记录</option>
                    </select>
                  </label>
                  <label className="fiction-check">
                    <input
                      type="checkbox"
                      checked={fictional}
                      onChange={(e) => setFictional(e.target.checked)}
                    />
                    这是想象作品，不是现实观察
                  </label>
                </>
              )}
              <label>
                这段表达用了什么帮助？
                <select
                  value={assistance}
                  onChange={(e) =>
                    setAssistance(e.target.value as typeof assistance)
                  }
                >
                  <option value="none">我自己表达</option>
                  <option value="parent">有家长帮助</option>
                  <option value="ai">参考了AI建议</option>
                </select>
              </label>
              <div className="workbench-actions">
                <button
                  className="explore-primary"
                  disabled={
                    !value.trim() ||
                    (stage === "evidence" &&
                      source !== "observed" &&
                      !citation.trim())
                  }
                  onClick={() => {
                    if (stage === "thought")
                      commit({
                        kind: first ? "plan_written" : "hypothesis_submitted",
                        text: value,
                        assistance,
                      });
                    if (stage === "evidence")
                      commit({
                        kind: "evidence_added",
                        text: value,
                        source,
                        citation,
                        inference,
                        artifactIds: [],
                        assistance,
                      });
                    if (stage === "revise")
                      commit({
                        kind: "claim_written",
                        text: value,
                        certainty,
                        unresolved:
                          certainty === "uncertain" ? "还需要更多证据" : "",
                        assistance,
                      });
                    if (stage === "creation")
                      commit({
                        kind: "artifact_created",
                        text: value,
                        category,
                        fictional,
                        artifactIds: [],
                        assistance,
                      });
                  }}
                >
                  留在本页
                </button>
                {stage === "revise" && (
                  <button
                    disabled={!value.trim() || !first || !evidence.length}
                    onClick={() =>
                      commit({
                        kind: "hypothesis_revised",
                        text: value,
                        evidenceEventIds: evidence.map((e) => e.eventId),
                        assistance,
                      })
                    }
                  >
                    用证据修改猜想
                  </button>
                )}
                {stage === "revise" && (
                  <button
                    disabled={!value.trim()}
                    onClick={() =>
                      commit({
                        kind: "reflection_written",
                        text: value,
                        assistance,
                      })
                    }
                  >
                    记下这次反思
                  </button>
                )}
                <button disabled={!value} onClick={() => setValue("")}>
                  撤销未提交文字
                </button>
              </div>
            </>
          )}
          <p role="status" className="explore-status">
            {message}
          </p>
        </div>
        <aside className="explore-coach" aria-label="思考小帮手">
          <span className="coach-symbol" aria-hidden="true">
            ?
          </span>
          <h2>我先想一想</h2>
          <p>需要时再打开一点提示。这里是离线引导，不是AI替你回答。</p>
          <button
            onClick={() => {
              setPrompt("");
              document.getElementById("explore-work-text")?.focus();
            }}
          >
            我先自己想
          </button>
          <button onClick={() => help("ask-back")}>问我一个问题</button>
          <button disabled={!first} onClick={() => help("idea")}>
            给一个方法提示
          </button>
          <button disabled={!first} onClick={() => help("study-source")}>
            怎么核对资料
          </button>
          <button disabled={!first} onClick={() => help("review-help")}>
            帮我反过来想
          </button>
          {!first && <small>先留下自己的第一种想法，再请求更多帮助。</small>}
          {prompt && (
            <p role="status" className="coach-prompt">
              {prompt}
            </p>
          )}
          <details>
            <summary>图画、照片和语音</summary>
            <p>
              本次不拍照、不录音、不上传。你可以在纸上画好，先用文字描述；私有保存功能会在记录底座完成后接入。
            </p>
          </details>
        </aside>
      </div>
      {project.subjectRefs.length > 0 && (
        <section className="explore-references">
          <h2>从哪里开始的？</h2>
          {project.subjectRefs.map((ref, i) => {
            const lesson = catalog.lessons.find(
              (l) => ref.subjectId === "math" && l.lessonId === ref.contentId,
            );
            return (
              <div key={i}>
                {lesson ? (
                  <>
                    <a href={"/subjects/math/lessons/" + lesson.lessonId}>
                      回到数学：{lesson.title}
                    </a>
                    <small>
                      关联版本 {ref.contentVersion}
                      {ref.contentVersion !== lesson.contentVersion
                        ? " · 内容已更新，请对照原版本"
                        : ""}
                    </small>
                  </>
                ) : (
                  <p>
                    {ref.subjectId === "english"
                      ? "英语关联示例，词库尚未接入，不假造可用词卡。"
                      : "原内容暂不可用，保留引用，不跳转到别的课程。"}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}
    </section>
  );
}
export default function Explore({ catalog }: { catalog: Catalog }) {
  const { projects, discard } = useExplore(),
    [search, setSearch] = useState(""),
    [confirm, setConfirm] = useState(false);
  const route = location.pathname.split("/")[2] ?? "",
    query = new URLSearchParams(location.search),
    id = query.get("id");
  const active = projects.find((p) => p.projectId === id);
  // Only a catalog-verified content ID travels in the URL; learner input never does.
  const lesson = catalog.lessons.find((l) => l.lessonId === query.get("from"));
  const refs: SubjectRef[] = lesson
    ? [
        {
          subjectId: "math",
          contentId: lesson.lessonId,
          contentVersion: lesson.contentVersion,
          relationship: "inspired-by",
        },
      ]
    : [];
  const filtered = projects
    .filter((p) => p.question.includes(search.trim()))
    .filter((p) =>
      route === "projects"
        ? !["archived", "pending"].includes(p.status)
        : route === "creations"
          ? p.events.some((e) => e.detail.kind === "artifact_created")
          : route === "archive"
            ? ["archived", "uncertain", "finished"].includes(p.status)
            : true,
    );
  return (
    <div className="explore-page" data-explore-page={route || "home"}>
      <nav className="explore-nav" aria-label="探索与创造栏目">
        <a href="/explore" aria-current={!route ? "page" : undefined}>
          探索首页
        </a>
        {tabs.map(([path, title]) => (
          <a
            key={path}
            href={"/explore/" + path}
            aria-current={path === route ? "page" : undefined}
          >
            {title}
          </a>
        ))}
      </nav>
      {route === "projects" && id ? (
        active ? (
          <Workspace key={id} project={active} catalog={catalog} />
        ) : (
          <section role="alert">
            <h1>这个临时问题已经不在本页了</h1>
            <p>
              刷新后会清空临时内容。你可以重新留下一个问题，或继续看公开示例。
            </p>
            <a href="/explore/questions">回到问题库</a>
          </section>
        )
      ) : (
        <>
          {!route ? (
            <section className="curiosity-hero">
              <div>
                <p className="explore-kicker">探索与创造</p>
                <h1>今天，你好奇什么？</h1>
                <p>
                  先留下自己的想法。试一试，找到证据，
                  <br className="desktop-break" />
                  也允许自己改变主意。
                </p>
                <div className="explore-note">一个问题，就可以开始。</div>
              </div>
              <NotebookPicture />
            </section>
          ) : (
            <header className="explore-section-heading">
              <h1>{tabs.find((t) => t[0] === route)?.[1]}</h1>
              <p>
                {tabs.find((t) => t[0] === route)?.[2]}
                。下面均为公开示例或本页临时操作。
              </p>
            </header>
          )}
          {(!route || route === "questions") && (
            <>
              {lesson && (
                <p className="linked-lesson">
                  从数学课堂「{lesson.title}」接着想。问题由你来写。
                </p>
              )}
              {query.has("from") && !lesson && (
                <p role="alert">关联课程不可用，仍然可以自由提问。</p>
              )}
              <Composer refs={refs} onCreated={go} />
            </>
          )}
          <section className="question-collection">
            <div className="collection-heading">
              <h2>{!route ? "别人的示例，也可以启发你" : "留下的线索"}</h2>
              <label>
                找一个问题
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="输入关键词"
                />
              </label>
            </div>
            <p className="example-disclaimer">
              示例是为了说明怎么探索，不是 Kevin 的真实提问、实验或作品。
            </p>
            {filtered.length ? (
              filtered.map((p) => <ProjectRow key={p.projectId} project={p} />)
            ) : (
              <div className="explore-empty">
                <h3>这里还没有合适的线索</h3>
                <p>可以换个关键词，或先在问题库留下一句好奇。</p>
                <a href="/explore/questions">去问题库</a>
              </div>
            )}
          </section>
          {!route && (
            <section className="explore-footnote">
              <b>不用每次都有答案。</b>
              <p>
                实验没成功、猜想被推翻、暂时不知道，都值得记住。每周选一个自己想多想想的问题就好；不排名，也不打卡。
              </p>
            </section>
          )}
        </>
      )}
      <div className="explore-demo-control">
        <p>
          预览不保存：本页文字只在内存中，刷新或关闭即清空；不发送给外部 AI。
        </p>
        <button onClick={() => setConfirm(true)}>清空本页试用</button>
        {confirm && (
          <div role="alert">
            <p>清空你本次留下的临时问题，恢复公开示例？</p>
            <button
              onClick={() => {
                discard();
                setConfirm(false);
                history.pushState(null, "", "/explore");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              确认清空
            </button>
            <button onClick={() => setConfirm(false)}>继续保留在本页</button>
          </div>
        )}
      </div>
    </div>
  );
}
