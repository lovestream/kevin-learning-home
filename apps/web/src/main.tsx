import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
const subject = location.pathname.split("/")[2];
const title =
  subject === "math" ? "数学" : subject === "english" ? "英语" : null;
function Home() {
  return (
    <main>
      <header>
        <a href="/" className="brand">
          Kevin Learning Home
        </a>
        <span>学习家园 · 建设中</span>
      </header>
      <section className="intro">
        <p className="note">留一个地方，让好奇心慢慢长大。</p>
        <h1>
          {title ? `${title}，准备搬入新家。` : "下一段学习，从这里开始。"}
        </h1>
        <p>
          {title
            ? "这个入口尚未开放。请继续使用原来的学习网站。"
            : "数学和英语的新入口正在准备。原来的两个学习网站继续独立运行。"}
        </p>
      </section>
      {title ? (
        <section className="empty">
          <h2>{title}待迁入</h2>
          <p>这里还没有课程，也没有学习记录。</p>
          <a href="/">返回家园</a>
        </section>
      ) : (
        <nav aria-label="学科入口">
          <a href="/subjects/math">
            <span className="symbol" aria-hidden="true">
              ＋
            </span>
            <div>
              <h2>数学</h2>
              <p>待迁入</p>
            </div>
          </a>
          <a href="/subjects/english">
            <span className="symbol" aria-hidden="true">
              Aa
            </span>
            <div>
              <h2>英语</h2>
              <p>待迁入</p>
            </div>
          </a>
        </nav>
      )}
      <footer>正式学科尚未整合。本页面不会保存或同步学习进度。</footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Home />);
