import { useEffect, useRef, useState, type ReactNode } from "react";
import { learningSpaces, pinnedSpaces } from "./home/spaces.ts";
import "./home/navigation.css";
export const pathwayLinks = [
  {
    key: "book",
    title: "按课本学习",
    hint: "从熟悉的一页开始",
    href: "/subjects/math?term=upper",
    icon: "book",
  },
  {
    key: "topics",
    title: "专题探索",
    hint: "四至六年级的主题",
    href: "/subjects/math/library?kind=legacy",
    icon: "shapes",
  },
  {
    key: "detective",
    title: "数学侦探",
    hint: "找错，再检查自己",
    href: "/subjects/math/detective",
    icon: "search",
  },
  {
    key: "thinking",
    title: "思维训练",
    hint: "为解释寻找证据",
    href: "/subjects/math/library?kind=thinking",
    icon: "bulb",
  },
  {
    key: "review",
    title: "复习站",
    hint: "回到熟悉的关系",
    href: "/subjects/math/library?kind=review",
    icon: "repeat",
  },
  {
    key: "methods",
    title: "方法工具箱",
    hint: "多一种解题办法",
    href: "/subjects/math/library?kind=methods",
    icon: "tools",
  },
];
export function MathIcon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    book: (
      <>
        <path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3Z" />
        <path d="M12 6v16 M6 9h3 M15 9h3 M6 13h3 M15 13h3" />
      </>
    ),
    shapes: (
      <>
        <path d="M3 11 8 3l5 8Z M13 14h8v8h-8Z" />
        <circle cx="6" cy="19" r="4" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 7 7 M7 10h6 M10 7v6" />
      </>
    ),
    bulb: (
      <>
        <path d="M8 18c0-4-4-4-4-9a8 8 0 0 1 16 0c0 5-4 5-4 9Z M8 21h8 M10 24h4 M9 7l3 5 3-5" />
      </>
    ),
    repeat: (
      <>
        <path d="M20 9a8 8 0 1 0 0 7 M20 3v6h-6" />
        <path d="m8 12 3 3 5-5" />
      </>
    ),
    tools: (
      <>
        <path d="M3 5h7v6H3Z M14 5h7v6h-7Z M3 15h7v6H3Z M14 15h7v6h-7Z" />
      </>
    ),
    flag: <path d="M5 23V4h15l-4 5 4 5H5" />,
    pencil: (
      <>
        <path d="m16 3 6 6-12 12-7 2 2-7Z M13 6l6 6" />
      </>
    ),
    heart: <path d="M13 22 4 13C-3 5 7-1 13 6c6-7 16-1 9 7Z" />,
    folder: <path d="M3 6h8l3 3h9v13H3Z" />,
    bolt: <path d="m15 2-12 14h9l-1 9L23 10h-9Z" />,
    sound: (
      <>
        <path d="M3 10h5l6-6v18l-6-6H3Z M18 8q6 5 0 10 M21 4q10 9 0 18" />
      </>
    ),
    menu: <path d="M3 5h18 M3 12h18 M3 19h18" />,
    arrow: <path d="M4 12h16 M14 6l6 6-6 6" />,
    close: <path d="m5 5 14 14 M5 19 19 5" />,
    home: <path d="m3 12 10-9 10 9 M6 10v13h5v-7h4v7h5V10" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.shapes}
    </svg>
  );
}
function SubjectNavigation({ panel = false }: { panel?: boolean }) {
  const active = location.pathname.startsWith("/subjects/english")
    ? "english"
    : location.pathname.startsWith("/explore")
      ? "explore"
      : location.pathname.startsWith("/subjects/math") ||
          location.pathname.startsWith("/lesson/")
        ? "math"
        : null;
  return (
    <nav
      className={panel ? "panel-subjects" : "preview-subjects"}
      aria-label="学科导航"
    >
      {pinnedSpaces().map((space) => (
        <a
          key={space.id}
          href={space.href!}
          aria-current={active === space.id ? "page" : undefined}
        >
          <MathIcon name={space.id === "math" ? "book" : "bulb"} size={21} />
          {space.title}
        </a>
      ))}
      {learningSpaces
        .filter((s) => !s.available)
        .map((s) => (
          <span key={s.id} aria-disabled="true">
            {s.id === "english" ? "英语 · 待迁入" : "成长家园 · 待接入"}
          </span>
        ))}
    </nav>
  );
}
function Pathways() {
  const kind = new URLSearchParams(location.search).get("kind"),
    active = location.pathname.includes("/detective")
      ? "detective"
      : kind === "legacy"
        ? "topics"
        : kind === "thinking"
          ? "thinking"
          : kind === "review"
            ? "review"
            : kind === "methods"
              ? "methods"
              : "book";
  return (
    <nav aria-label="学习路径" className="pathways">
      {pathwayLinks.map((p) => (
        <a
          key={p.key}
          href={p.href}
          aria-current={active === p.key ? "page" : undefined}
        >
          <MathIcon name={p.icon} />
          <span>
            {p.title}
            <small>{p.hint}</small>
          </span>
        </a>
      ))}
    </nav>
  );
}
const englishLinks = [
  ["", "英语书架", "book"],
  ["?view=sprint", "考试冲刺", "flag"],
  ["?view=mywords", "我的生词本", "pencil"],
  ["?view=review", "本次回顾", "repeat"],
  ["?view=notebook", "本次收藏", "heart"],
  ["?view=pack", "生词包", "folder"],
  ["?view=pk", "机器人PK", "bolt"],
  ["?view=source", "内容与声音", "sound"],
];
function EnglishNavigation({ search }: { search: string }) {
  const view = new URLSearchParams(search).get("view") ?? "";
  return (
    <nav className="pathways english-pathways" aria-label="英语活动">
      {englishLinks.map(([suffix, title, icon]) => (
        <a
          key={title}
          href={"/subjects/english" + suffix}
          aria-current={
            (suffix ? new URLSearchParams(suffix).get("view") : "") === view
              ? "page"
              : undefined
          }
        >
          <MathIcon name={icon} size={21} />
          <span>{title}</span>
        </a>
      ))}
    </nav>
  );
}
export default function DesignShell({
  children,
  recordMode = "preview",
}: {
  children: ReactNode;
  recordMode?: "preview" | "synthetic-private" | "private";
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [search, setSearch] = useState(location.search);
  const panel = useRef<HTMLElement>(null),
    menu = useRef<HTMLButtonElement>(null);
  const home = location.pathname === "/",
    explore = location.pathname.startsWith("/explore"),
    english = location.pathname.startsWith("/subjects/english");
  useEffect(() => {
    const update = () => {
      setSearch(location.search);
      setNavigationOpen(false);
    };
    addEventListener("popstate", update);
    addEventListener("klh:english-navigation", update);
    return () => {
      removeEventListener("popstate", update);
      removeEventListener("klh:english-navigation", update);
    };
  }, []);
  useEffect(() => {
    if (!navigationOpen) return;
    const outside = (e: PointerEvent) => {
      if (
        e.target instanceof Node &&
        !panel.current?.contains(e.target) &&
        !menu.current?.contains(e.target)
      )
        setNavigationOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavigationOpen(false);
        menu.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [navigationOpen]);
  return (
    <div
      className={
        "site-shell preview-shell preview-app" +
        (english ? " english-shell" : "")
      }
    >
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <aside className="learning-sidebar">
        <div className="side-sign">
          <span className="home-monogram" aria-hidden="true">
            K
          </span>
          <div>
            Kevin 学习家园
            <small>
              {home
                ? "在这里，慢慢发现"
                : explore
                  ? "探索与创造"
                  : english
                    ? "英语天地"
                    : "数学书房"}
            </small>
          </div>
        </div>
        <a
          className="side-home-link"
          href="/"
          aria-current={home ? "page" : undefined}
        >
          <MathIcon name="home" size={21} />
          家园首页
        </a>
        <SubjectNavigation />
        <p className="side-caption">今天想去哪里？</p>
        {home ? (
          <p className="side-home-hint">
            从学习空间进入，
            <br />
            再找到你想学的那一课。
          </p>
        ) : english ? (
          <EnglishNavigation search={search} />
        ) : explore ? (
          <nav className="pathways" aria-label="探索路径">
            {[
              ["questions", "问题库"],
              ["projects", "正在探索"],
              ["creations", "我的创造"],
              ["archive", "发现档案"],
            ].map(([id, title]) => (
              <a
                key={id}
                href={"/explore/" + id}
                aria-current={
                  location.pathname.endsWith("/" + id) ? "page" : undefined
                }
              >
                <MathIcon name="bulb" />
                <span>{title}</span>
              </a>
            ))}
          </nav>
        ) : (
          <Pathways />
        )}
        <div className="side-note">
          <MathIcon name="bulb" size={28} />
          <p>
            今天发现一个
            <br />
            “为什么”了吗？
          </p>
        </div>
        <span className="side-foot">探索 · 表达 · 验证</span>
      </aside>
      <div className="preview-workspace">
        <header className="topbar">
          <a className="brand" href="/">
            {english ? (
              <>
                <span className="english-brand-mark" aria-hidden="true">
                  W
                </span>
                <span>
                  Word Quest<small>Kevin 的单词探险</small>
                </span>
              </>
            ) : (
              "Kevin 学习家园"
            )}
          </a>
          <span className="topbar-context">
            {home
              ? "家园首页"
              : explore
                ? "探索与创造"
                : english
                  ? "英语天地"
                  : "数学书房"}
          </span>
          <button
            ref={menu}
            className="menu-toggle"
            aria-controls="learning-navigation"
            aria-expanded={navigationOpen}
            onClick={() => setNavigationOpen((open) => !open)}
          >
            <MathIcon name="menu" />
            <span>学习导航</span>
          </button>
          <span className="experience-chip">
            {recordMode === "preview"
              ? "免登录体验"
              : recordMode === "synthetic-private"
                ? "合成隔离测试"
                : "家庭学习"}
          </span>
        </header>
        <aside
          id="learning-navigation"
          ref={panel}
          className="learning-panel"
          aria-label="学习导航面板"
          hidden={!navigationOpen}
          onClick={(e) => {
            if (e.target instanceof Element && e.target.closest("a"))
              setNavigationOpen(false);
          }}
        >
          <div className="panel-head">
            <div>
              <small>Kevin 学习家园</small>
              <h2>学习导航</h2>
            </div>
            <button
              aria-label="关闭学习导航"
              onClick={() => {
                setNavigationOpen(false);
                menu.current?.focus();
              }}
            >
              <MathIcon name="close" />
            </button>
          </div>
          <a className="panel-home" href="/">
            <MathIcon name="home" size={20} />
            返回家园首页
          </a>
          <p className="panel-label">学习空间</p>
          <SubjectNavigation panel />
          {english ? (
            <>
              <p className="panel-label">直接选择词库</p>
              <nav className="panel-banks" aria-label="英语词库">
                {[
                  ["core2000", "2000 Core English Words"],
                  ["movers", "Movers 看图学词"],
                  ["ket", "KET 词汇"],
                  ["pet", "PET 词汇"],
                ].map(([id, title]) => (
                  <a key={id} href={"/subjects/english?bank=" + id}>
                    {title}
                    <MathIcon name="arrow" size={18} />
                  </a>
                ))}
              </nav>
              <p className="panel-label">英语学习</p>
              <EnglishNavigation search={search} />
            </>
          ) : (
            !explore && (
              <>
                <p className="panel-label">数学学习</p>
                <Pathways />
              </>
            )
          )}
        </aside>
        <details className="preview-banner">
          <summary>
            {recordMode === "preview"
              ? "仅本页体验，不保存学习记录"
              : recordMode === "synthetic-private"
                ? "仅合成资料：探索项目会保存，原站数据不接入"
                : "探索项目保存在家园，不发送给外部 AI"}
          </summary>
          <p>
            {recordMode === "preview"
              ? "无需账号，无真实学习资料。刷新或离开页面会清空本次作答、操作和自查；正确反馈不代表长期掌握，解释请与家长核对。"
              : "孩子使用家长授权过的设备自动进入；家长查看时才登录，不设孩子密码或第二个 PIN。保存失败会保留输入并提示重试；图片和语音不会发送给外部 AI。"}
          </p>
        </details>
        {children}
        <footer className="preview-footer">
          <span>Kevin 学习家园 · 探索、表达、验证</span>
          <span>认真想一想，也允许再试一次。</span>
          <details>
            <summary>关于本次体验</summary>
            <p>
              原数学与英语网站继续独立运行。此入口不记录真实成绩、积分或宠物状态。
            </p>
          </details>
        </footer>
      </div>
    </div>
  );
}
