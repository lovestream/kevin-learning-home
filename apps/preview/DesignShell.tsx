import { useRef, type ReactNode } from "react";
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
    menu: <path d="M3 5h18 M3 12h18 M3 19h18" />,
    arrow: <path d="M4 12h16 M14 6l6 6-6 6" />,
    close: <path d="m5 5 14 14 M5 19 19 5" />,
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
export default function DesignShell({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null),
    menu = useRef<HTMLButtonElement>(null);
  return (
    <div className="site-shell preview-shell preview-app">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <aside className="learning-sidebar">
        <div className="side-sign">
          <span className="home-monogram" aria-hidden="true">
            K
          </span>
          <div>
            Kevin 学习家园<small>数学实验室</small>
          </div>
        </div>
        <p className="side-caption">今天想去哪里？</p>
        <Pathways />
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
            Kevin 学习家园
          </a>
          <nav className="preview-subjects" aria-label="学科导航">
            <a href="/subjects/math" aria-current="page">
              数学 · 课程与探索
            </a>
            <span aria-disabled="true">英语 · 待迁入</span>
          </nav>
          <button
            ref={menu}
            className="menu-toggle"
            aria-controls="learning-dialog"
            onClick={() => dialog.current?.showModal()}
          >
            <MathIcon name="menu" />
            <span>学习导航</span>
          </button>
          <span className="experience-chip">免登录体验</span>
        </header>
        <dialog
          id="learning-dialog"
          ref={dialog}
          className="learning-dialog"
          onClose={() => menu.current?.focus()}
          onClick={(e) => {
            if (
              e.target === e.currentTarget ||
              (e.target instanceof Element && e.target.closest("a"))
            )
              dialog.current?.close();
          }}
        >
          <div className="dialog-head">
            <b>去哪里探索？</b>
            <button
              autoFocus
              aria-label="关闭学习导航"
              onClick={() => dialog.current?.close()}
            >
              <MathIcon name="close" />
            </button>
          </div>
          <nav className="dialog-subjects" aria-label="学科导航">
            <a href="/subjects/math" aria-current="page">
              数学 · 课程与探索
            </a>
            <span aria-disabled="true">英语 · 待迁入</span>
          </nav>
          <Pathways />
        </dialog>
        <details className="preview-banner">
          <summary>仅本页体验，不保存学习记录</summary>
          <p>
            无需账号，无真实学习资料。刷新或离开页面会清空本次作答、操作和自查；正确反馈不代表长期掌握，解释请与家长核对。
          </p>
        </details>
        {children}
        <footer className="preview-footer">
          <span>Kevin 学习家园 · 数学实验室</span>
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
