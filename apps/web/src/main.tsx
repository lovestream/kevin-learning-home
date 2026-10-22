import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  isShellRoute,
  isPublicRoute,
} from "../../../packages/contracts/routes.ts";
import { catalogDTO, request, type SubjectRegistration } from "./api.ts";
import { useIdentity } from "./identity.ts";
import "./style.css";

function House({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "house small" : "house"}
      viewBox="0 0 440 310"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="house-path"
        d="M275 289c-56-56-116 1-177-30s6-63 52-80"
      />
      <path
        className="house-hill"
        d="M25 242c78-53 130-35 196-43 84-10 110-1 194 36"
      />
      <path className="house-roof" d="m115 127 103-81 112 81" />
      <path className="house-wall" d="M134 115v116h174V115" />
      <path className="house-door" d="M205 231v-70h40v70" />
      <path
        className="house-window"
        d="M157 143h29v31h-29zM263 143h29v31h-29z"
      />
      <path
        className="house-leaf"
        d="M351 232v-50m0 22c-32-1-38-22-31-36 22 0 33 12 31 36Zm0-8c0-27 16-44 34-42 3 23-12 41-34 42Z"
      />
      <path
        className="house-sun"
        d="M352 43v-9m0 48v-9m19-15h9m-57 0h9m33-13 7-7m-39 39 7-7m25 0 7 7m-39-39 7 7"
      />
      <circle className="house-sun" cx="352" cy="58" r="11" />
      <path
        className="house-book"
        d="m54 168 21 7 18-13v34l-18 11-21-7Zm21 7v32"
      />
    </svg>
  );
}
const nav = [
  ["/home", "今日学习", "home"],
  ["/today", "今日计划", "plan"],
  ["/subjects", "科目", "book"],
  ["/review", "复习", "review"],
  ["/growth", "成长家园", "leaf"],
] as const;
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7",
    plan: "M5 5h14v16H5zM8 3v4m8-4v4M8 11h8M8 15h6",
    book: "M3 5c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2zM12 7v15",
    review: "M4 10a8 8 0 1 1 1 8M4 4v6h6M12 8v5l3 2",
    leaf: "M5 20C2 11 8 4 21 3c0 12-7 18-16 17ZM5 20 16 9",
    parent: "M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7zM8 12l3 3 5-6",
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.book} />
    </svg>
  );
}
function Credentials({
  unlock = false,
  identity,
  authEnabled,
}: {
  unlock?: boolean;
  identity: ReturnType<typeof useIdentity>;
  authEnabled: boolean | null;
}) {
  const { state } = identity;
  const [login, setLogin] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.busy || authEnabled === false || !navigator.onLine) return;
    const secret = password;
    setPassword("");
    setShow(false);
    if (unlock) await identity.act("parent-unlock", { password: secret });
    else await identity.act("login", { login, password: secret });
  }
  return (
    <form
      onSubmit={submit}
      className="credentials"
      aria-label={unlock ? "家长二次解锁" : "账户登录"}
      aria-busy={state.busy}
    >
      {!unlock && (
        <div className="field">
          <label htmlFor="login-name">登录名</label>
          <input
            id="login-name"
            name="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={64}
            disabled={state.busy || authEnabled === false}
            aria-describedby={state.notice ? "auth-notice" : undefined}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor={unlock ? "unlock-password" : "login-password"}>
          {unlock ? "再次输入家长密码" : "密码"}
        </label>
        <div className="password-field">
          <input
            id={unlock ? "unlock-password" : "login-password"}
            type={show ? "text" : "password"}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            maxLength={128}
            disabled={state.busy || authEnabled === false}
            aria-describedby={state.notice ? "auth-notice" : undefined}
          />
          <button
            type="button"
            className="password-toggle"
            aria-pressed={show}
            onClick={() => setShow(!show)}
            disabled={state.busy}
          >
            {show ? "隐藏密码" : "显示密码"}
          </button>
        </div>
      </div>
      <button
        className="button primary"
        type="submit"
        disabled={state.busy || authEnabled === false || !navigator.onLine}
      >
        {state.busy ? "正在确认…" : unlock ? "解锁家长权限" : "登录"}
      </button>
      <p className="form-help">
        {unlock
          ? "短时解锁后，只显示获得授权的学习者。离开前请主动锁定。"
          : "使用各自的家庭账户登录。孩子与家长使用不同身份。"}
      </p>
    </form>
  );
}

function App() {
  const identity = useIdentity(),
    { state } = identity;
  const [path, setPath] = useState(location.pathname),
    [catalog, setCatalog] = useState<SubjectRegistration[] | null>(null),
    [authEnabled, setAuthEnabled] = useState<boolean | null>(null),
    [catalogError, setCatalogError] = useState("");
  const main = useRef<HTMLElement>(null),
    catalogRequest = useRef<AbortController | null>(null);
  const authenticated = state.phase === "authenticated" && !!state.session;
  const parent = authenticated && state.session!.actor.role === "parent";
  const selected = state.learners.find((l) => l.id === state.selected);
  async function loadCatalog() {
    catalogRequest.current?.abort();
    const control = new AbortController();
    catalogRequest.current = control;
    const timeout = setTimeout(() => control.abort(), 8000);
    setCatalogError("");
    try {
      const result = catalogDTO(
        await request("/api/v1/config", control.signal),
      );
      if (!control.signal.aborted) {
        setCatalog(result.subjects);
        setAuthEnabled(result.auth);
      }
    } catch {
      if (catalogRequest.current === control) {
        setCatalog(null);
        setCatalogError("科目列表暂时无法确认，其他入口仍可使用。");
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  useEffect(() => {
    void loadCatalog();
    return () => catalogRequest.current?.abort();
  }, []);
  useEffect(() => {
    const pop = () => {
      setPath(location.pathname);
      void identity.sync();
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const titles: Record<string, string> = {
      "/login": "登录",
      "/home": "今日学习",
      "/today": "今日计划",
      "/subjects": "科目",
      "/review": "复习",
      "/growth": "成长家园",
      "/parent": "家长中心",
      "/parent/report": "家长报告",
    };
    document.title = titles[path]
      ? titles[path] + " · Kevin 学习家园"
      : "Kevin 学习家园";
  }, [path]);
  useEffect(() => {
    if (authenticated && path === "/login") {
      const target = parent ? "/parent" : "/home";
      history.replaceState(null, "", target);
      setPath(target);
      requestAnimationFrame(() => main.current?.focus());
    }
  }, [authenticated, parent, path]);
  function navigate(to: string) {
    if ((state.busy && state.operation !== "确认权限") || !isShellRoute(to))
      return;
    history.pushState(null, "", to);
    setPath(to);
    void identity.sync();
    requestAnimationFrame(() => main.current?.focus());
  }
  function Link({
    to,
    children,
    className = "",
    label,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
    label?: string;
  }) {
    return (
      <a
        href={to}
        className={className}
        aria-label={label}
        aria-current={path === to ? "page" : undefined}
        onClick={(e) => {
          if (
            e.button === 0 &&
            !e.metaKey &&
            !e.ctrlKey &&
            !e.shiftKey &&
            !e.altKey
          ) {
            e.preventDefault();
            navigate(to);
          }
        }}
      >
        {children}
      </a>
    );
  }
  function SubjectLinks() {
    if (catalogError)
      return (
        <section className="notice" role="status">
          <p>{catalogError}</p>
          <button className="text-button" onClick={() => void loadCatalog()}>
            重新读取科目
          </button>
        </section>
      );
    if (!catalog) return <p role="status">正在确认科目列表…</p>;
    if (!catalog.length)
      return (
        <p className="empty-inline">
          暂时没有可用的科目入口。你仍可使用家园的其他页面。
        </p>
      );
    return (
      <div className="subject-links">
        {catalog.map((s) => (
          <Link
            key={s.id}
            to={"/subjects/" + s.id}
            className={"subject-tab " + s.accent}
          >
            <span className="subject-mark" aria-hidden="true">
              {s.mark}
            </span>
            <span>
              <span className="subject-name">{s.title}</span>
              <span className="subject-status">
                {s.status === "awaiting-migration" ? "待迁入" : "暂不可用"}
              </span>
            </span>
            <span className="tab-corner" aria-hidden="true" />
          </Link>
        ))}
      </div>
    );
  }
  function Empty({
    title,
    children,
    kind = "book",
  }: {
    title: string;
    children: React.ReactNode;
    kind?: string;
  }) {
    return (
      <section className="empty-state">
        <span className="empty-icon">
          <Icon name={kind} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{children}</p>
        </div>
      </section>
    );
  }
  function Welcome() {
    return (
      <>
        <section className="welcome">
          <div className="welcome-copy">
            <p className="intro-note">留一个地方，让好奇心慢慢长大。</p>
            <h1>下一段学习，从这里开始。</h1>
            <p className="lead">把今天的好奇，留给数学、英语和更大的世界。</p>
            <p>数学和英语的新入口正在准备。原来的两个学习网站继续独立运行。</p>
            <Link
              to={authenticated ? (parent ? "/parent" : "/home") : "/login"}
              className="button primary"
            >
              {authenticated ? "进入学习家园" : "登录学习家园"}
            </Link>
          </div>
          <House />
        </section>
        <section
          className="public-subjects"
          aria-labelledby="public-subject-title"
        >
          <h2 id="public-subject-title">为新的学习留好位置</h2>
          <SubjectLinks />
        </section>
      </>
    );
  }
  function Login() {
    if (authenticated)
      return (
        <section className="login-panel">
          <h1>你已登录学习家园</h1>
          <p>
            当前身份：{parent ? "家长" : "孩子"}。身份和权限由学习家园确认。
          </p>
          <Link className="button primary" to={parent ? "/parent" : "/home"}>
            继续进入家园
          </Link>
        </section>
      );
    return (
      <section className="login-layout">
        <div className="login-story">
          <House small />
          <h1>欢迎回到学习家园</h1>
          <p>从自己的账户开始，慢慢探索。</p>
          <Link to="/">返回家园</Link>
        </div>
        <div className="login-panel">
          <h2>登录</h2>
          {authEnabled === false && (
            <p className="notice">登录服务尚未启用，请联系家庭管理员。</p>
          )}
          <Credentials identity={identity} authEnabled={authEnabled} />
          <details className="recovery">
            <summary>忘记密码怎么办？</summary>
            <p>
              请联系家庭管理员，通过受控的离线恢复流程处理。这里暂不提供在线重置。
            </p>
          </details>
        </div>
      </section>
    );
  }
  function ParentPage() {
    if (!parent)
      return (
        <>
          <h1>这个入口只对家长开放</h1>
          <p>当前孩子账户不能查看家长内容。</p>
          <Link to="/home" className="button secondary">
            返回今日学习
          </Link>
        </>
      );
    if (!state.session!.parentUnlocked)
      return (
        <section className="parent-locked">
          <span className="lock-emblem">
            <Icon name="parent" />
          </span>
          <h1>家长权限已锁定</h1>
          <p>再次确认身份后，才会显示获得授权的学习者和家长入口。</p>
          <Credentials unlock identity={identity} authEnabled={authEnabled} />
        </section>
      );
    return (
      <div className="private-content">
        <div className="page-heading">
          <div>
            <p className="intro-note">家长权限已解锁</p>
            <h1>{path === "/parent/report" ? "家长报告" : "家长中心"}</h1>
            <p>仅可管理已获得授权的学习者，短时权限到期会自动隐藏。</p>
          </div>
          <button
            className="button secondary"
            onClick={() => void identity.act("parent-lock")}
          >
            锁定家长权限
          </button>
        </div>
        {state.learners.length ? (
          <section className="learner-picker" aria-labelledby="learner-title">
            <h2 id="learner-title">选择学习者</h2>
            <div className="learner-options">
              {state.learners.map((l, i) => (
                <button
                  id={"learner-choice-" + i}
                  key={l.id}
                  type="button"
                  className={
                    "learner-option " +
                    (state.selected === l.id ? "chosen" : "")
                  }
                  aria-pressed={state.selected === l.id}
                  onClick={() => void identity.sync(l.id)}
                >
                  <span className="learner-initial" aria-hidden="true">
                    {l.label.slice(0, 1)}
                  </span>
                  <span>{l.label}</span>
                  {state.selected === l.id && (
                    <span className="chosen-label">已选择</span>
                  )}
                </button>
              ))}
            </div>
            <p className="form-help">切换时会重新确认当前授权。</p>
          </section>
        ) : (
          <Empty title="还没有可管理的学习者" kind="parent">
            当前没有可用授权，请联系家庭管理员确认。
          </Empty>
        )}
        {selected ? (
          <>
            <section className="report-placeholder">
              <h2>{selected.label}的学习报告</h2>
              <p>家长报告尚未接入</p>
              <p>
                课程和学习记录迁入后，这里才能整理出相应的报告。现在没有可展示的数据。
              </p>
            </section>
            {path !== "/parent/report" && (
              <Link to="/parent/report" className="text-link">
                查看报告入口
              </Link>
            )}
          </>
        ) : (
          state.learners.length > 0 && (
            <p className="empty-inline">先选择一位学习者，再查看报告入口。</p>
          )
        )}
      </div>
    );
  }
  function SubjectPage() {
    const id = path.slice("/subjects/".length),
      subject = catalog?.find((s) => s.id === id);
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="intro-note">学科入口</p>
            <h1>
              {subject
                ? subject.title +
                  (subject.status === "awaiting-migration"
                    ? "待迁入"
                    : "暂不可用")
                : "这个科目暂未接入"}
            </h1>
            <p>这里还没有课程，也没有学习记录。</p>
          </div>
          {subject && (
            <span className={"large-mark " + subject.accent} aria-hidden="true">
              {subject.mark}
            </span>
          )}
        </div>
        {catalogError ? (
          <p className="notice">{catalogError}</p>
        ) : (
          <Empty title={subject ? "课程还在准备" : "这个科目还没有准备好"}>
            原来的学习网站仍然独立运行。这里暂不提供课程、练习、复习安排或进度同步。
          </Empty>
        )}
        <Link
          to={authenticated ? "/subjects" : "/"}
          className="button secondary"
        >
          返回家园
        </Link>
      </>
    );
  }
  function Workspace() {
    if (path.startsWith("/parent")) return ParentPage();
    if (path === "/subjects")
      return (
        <>
          <div className="page-heading">
            <div>
              <h1>科目</h1>
              <p>一个入口，慢慢装下更多好奇。</p>
            </div>
            <Icon name="book" />
          </div>
          <SubjectLinks />
          <aside className="future-note">
            <h2>给未来的科目留一页</h2>
            <p>以后可以加入语文、科学等新科目。它们现在还不是已安装的课程。</p>
          </aside>
        </>
      );
    if (path === "/today")
      return (
        <>
          <h1>今日计划</h1>
          <Empty title="今天还没有学习任务" kind="plan">
            课程尚未接入，因此暂时没有可安排的学习或复习任务。
          </Empty>
          <p className="quiet-note">
            这里不会自动生成计划，也不会写入奖励或学习记录。
          </p>
          <Link to="/subjects" className="button secondary">
            看看科目入口
          </Link>
        </>
      );
    if (path === "/review")
      return (
        <>
          <h1>复习</h1>
          <Empty title="暂时没有需要复习的内容" kind="review">
            课程尚未接入，复习安排也还没有开始。以后会由各个科目提供自己的复习内容。
          </Empty>
          <Link to="/subjects" className="button secondary">
            看看科目入口
          </Link>
        </>
      );
    if (path === "/growth")
      return (
        <>
          <div className="growth-intro">
            <div>
              <h1>给成长留一点空间</h1>
              <p>一点好奇，一点探索，慢慢长成自己的样子。</p>
            </div>
            <House small />
          </div>
          <Empty title="成长家园还在准备" kind="leaf">
            这里暂时没有积分、伙伴或成长记录。以后开放的内容会另行说明。
          </Empty>
        </>
      );
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="intro-note">{parent ? "家长账户" : "我的学习家园"}</p>
            <h1>今天，想从哪里开始？</h1>
            <p>
              {selected ? (
                <span className="private-content">{selected.label}，</span>
              ) : null}
              给好奇心留一点时间。
            </p>
          </div>
          <span className="day-marker" aria-hidden="true">
            <Icon name="home" />
          </span>
        </div>
        <section className="today-sheet">
          <div className="section-heading">
            <h2>今日学习</h2>
            <Link to="/today" className="text-link">
              查看今日计划
            </Link>
          </div>
          <Empty title="今天还没有学习任务" kind="plan">
            数学和英语还在准备迁入。你可以先看看它们的新位置。
          </Empty>
        </section>
        <section className="home-subjects">
          <h2>从喜欢的科目开始</h2>
          <SubjectLinks />
        </section>
        <section className="gentle-note">
          <Icon name="leaf" />
          <p>没有赶路的任务，就留一点时间观察和提问。</p>
        </section>
      </>
    );
  }
  const publicPath = isPublicRoute(path);
  const content = !isShellRoute(path) ? (
    <>
      <h1>没有找到这个页面</h1>
      <Link to="/">返回家园</Link>
    </>
  ) : path === "/" ? (
    Welcome()
  ) : path === "/login" ? (
    Login()
  ) : path.startsWith("/subjects/") ? (
    SubjectPage()
  ) : !authenticated ? (
    <section className="access-gate">
      <Icon name="parent" />
      <h1>
        {state.phase === "checking"
          ? "正在确认身份"
          : state.phase === "unconfirmed"
            ? "需要重新确认身份"
            : "请先登录学习家园"}
      </h1>
      <p>确认当前账户后，才能打开这个页面。</p>
      {state.phase === "anonymous" ? (
        <Link to="/login" className="button primary">
          前往登录
        </Link>
      ) : (
        !state.busy &&
        !state.notice && (
          <button
            className="button primary"
            onClick={() => void identity.sync()}
          >
            重新确认
          </button>
        )
      )}
    </section>
  ) : (
    Workspace()
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <div className="site-shell">
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-house" aria-hidden="true">
              <Icon name="home" />
            </span>
            <span>Kevin 学习家园</span>
          </Link>
          <div className="account-area">
            {authenticated ? (
              <>
                <span className="role-tag">
                  {parent ? "家长账户" : "孩子账户"}
                </span>
                <details className="account-menu">
                  <summary>账户</summary>
                  <button
                    className="text-button"
                    onClick={() => void identity.act("rotate")}
                  >
                    {parent ? "更新会话并锁定权限" : "更新会话"}
                  </button>
                </details>
                <button
                  className="text-button"
                  onClick={() => void identity.act("logout")}
                >
                  退出
                </button>
              </>
            ) : (
              <Link to="/login" className="login-link">
                登录
              </Link>
            )}
          </div>
        </header>
        <div
          className={
            authenticated && !publicPath ? "workspace" : "public-workspace"
          }
        >
          {authenticated && !publicPath && (
            <nav className="sidebar" aria-label="家园导航">
              {nav.map(([to, title, icon]) => (
                <Link key={to} to={to}>
                  <Icon name={icon} />
                  <span>{title}</span>
                </Link>
              ))}
              {parent && (
                <div className="parent-nav">
                  <Link to="/parent">
                    <Icon name="parent" />
                    <span>家长中心</span>
                  </Link>
                  {state.session!.parentUnlocked && (
                    <Link to="/parent/report">学习报告</Link>
                  )}
                </div>
              )}
            </nav>
          )}
          <main
            id="main-content"
            tabIndex={-1}
            ref={main}
            className="reading-area"
            aria-busy={state.busy}
          >
            {state.notice && (
              <div className="notice" role="alert" id="auth-notice">
                <p>{state.notice}</p>
                {state.phase === "unconfirmed" && !state.busy && (
                  <button
                    className="text-button"
                    onClick={() => void identity.sync()}
                  >
                    重新确认
                  </button>
                )}
              </div>
            )}
            {state.busy && (
              <div className="pending" role="status">
                <span>{state.operation || "正在确认"}，请稍候…</span>
                <button className="text-button" onClick={identity.cancel}>
                  取消等待
                </button>
              </div>
            )}
            {content}
          </main>
        </div>
        <footer className="site-footer">
          <span>慢慢学，也慢慢长大。</span>
          <span>数学与英语旧站继续独立运行，新家园暂不保存课程进度。</span>
        </footer>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
