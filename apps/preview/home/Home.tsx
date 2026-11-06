import { useRef, useState } from "react";
import type { Catalog } from "../contract.ts";
import {
  searchLessons,
  termTitles,
  type LearningMap,
} from "../learning-map.ts";
import { MathIcon } from "../DesignShell.tsx";
import { findSpaces, learningSpaces } from "./spaces.ts";
import "./home.css";

function DeskPicture() {
  const [view, setView] = useState(0);
  return (
    <div className="home-desk">
      <svg
        viewBox="0 0 510 320"
        role="img"
        aria-label={"书桌上的纸盒，正在观察" + ["前面", "右面", "上面"][view]}
      >
        <ellipse cx="269" cy="248" rx="212" ry="35" fill="#d0e9e1" />
        <path
          d="m37 188 222-83 218 94-218 85Z"
          fill="#e3c78c"
          stroke="#173d43"
          strokeWidth="2.5"
        />
        <path
          d="M37 188v12l222 97 218-85v-13L259 284Z"
          fill="#c9a86c"
          stroke="#173d43"
          strokeWidth="2.5"
        />
        <path
          d="m75 147 99-38 81 36-99 39Z"
          fill="#fffef8"
          stroke="#173d43"
          strokeWidth="2.5"
        />
        <path
          d="m75 147 1 23 80 37 99-40v-22l-99 39Z"
          fill="#9ccbc0"
          stroke="#173d43"
          strokeWidth="2.5"
        />
        <path
          d="m84 169 72 33 88-35 M156 185v17"
          fill="none"
          stroke="#5c8d83"
          strokeWidth="2"
        />
        <path
          d="m253 168 73-29 90 39-73 30Z"
          fill="#fffef8"
          stroke="#173d43"
          strokeWidth="2.5"
        />
        <path
          d="m267 166 62-24 74 32 M268 176l63-24 M284 184l64-25"
          fill="none"
          stroke="#9ccbc0"
          strokeWidth="2"
        />
        <path
          d="M142 105v78l65 32v-79Z"
          fill={view === 0 ? "#f6c848" : "#fce6a2"}
          stroke="#173d43"
          strokeWidth="3"
        />
        <path
          d="m142 105 64-29 66 29-65 31Z"
          fill={view === 2 ? "#f6c848" : "#fff2bf"}
          stroke="#173d43"
          strokeWidth="3"
        />
        <path
          d="m272 105-65 31v79l65-31Z"
          fill={view === 1 ? "#f6c848" : "#dda93d"}
          stroke="#173d43"
          strokeWidth="3"
        />
        <circle cx="174" cy="157" r="5" fill="#173d43" />
        <path d="m233 156 13-6v18l-13 6Z" fill="#173d43" />
        <path d="m199 99 18 0-10 9Z" fill="#173d43" />
        <path
          d="m350 134 16-66 9 2-15 67Z"
          fill="#f47759"
          stroke="#173d43"
          strokeWidth="2.5"
        />
        <path
          d="m350 134 1 15 9-12Z"
          fill="#f6c848"
          stroke="#173d43"
          strokeWidth="2"
        />
        <g transform="rotate(9 385 93)">
          <rect x="360" y="34" width="74" height="66" rx="4" fill="#fff1b7" />
          <path
            d="M374 52h39 M374 64h31 M374 76h24"
            stroke="#a58441"
            strokeWidth="2"
          />
        </g>
        <path
          d="M111 78q-5-28 21-35 M289 70q32 11 33 41"
          fill="none"
          stroke="#6faaa0"
          strokeWidth="2"
          strokeDasharray="4 7"
        />
        <circle cx="101" cy="55" r="3" fill="#f47759" />
        <circle cx="302" cy="43" r="4" fill="#167d7f" />
      </svg>
      <div className="desk-controls" aria-label="换个方向看纸盒">
        <span>换个方向看</span>
        {["前面", "右面", "上面"].map((label, i) => (
          <button
            key={label}
            aria-pressed={view === i}
            onClick={() => setView(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home({
  catalog,
  map,
}: {
  catalog: Catalog;
  map: LearningMap;
}) {
  const [query, setQuery] = useState(""),
    search = useRef<HTMLInputElement>(null);
  const results = searchLessons(map, catalog, query),
    spaces = findSpaces(query),
    searching = !!query.trim();
  const books = [
    {
      term: "upper",
      title: "三年级上册",
      hint: "从观察物体到数学广角",
      sub: map.units.filter((u) => u.term === "upper").length + " 个单元",
      color: "green",
    },
    {
      term: "lower",
      title: "三年级下册",
      hint: "从年月日到分数与小数",
      sub: map.units.filter((u) => u.term === "lower").length + " 个单元",
      color: "yellow",
    },
    {
      term: "bridge",
      title: "基础衔接",
      hint: "数量、分数、图形与等量",
      sub: map.bridgeGroups.length + " 个主题",
      color: "blue",
    },
  ];
  return (
    <div className="home-page" data-home-page>
      <section className="home-welcome">
        <div className="home-welcome-copy">
          <p className="home-greeting">Kevin，欢迎回家。</p>
          <h1>
            今天，想发现
            <br />
            一点什么？
          </h1>
          <p>
            翻开一节课，或追着一个为什么走一走。
            <br className="home-wide-break" />
            从你感兴趣的地方开始。
          </p>
          <a className="home-start" href="#learning-spaces">
            选一个学习空间 <MathIcon name="arrow" size={20} />
          </a>
        </div>
        <DeskPicture />
      </section>
      <section className="home-search" aria-label="在家园找一找">
        <MathIcon name="search" size={24} />
        <label htmlFor="home-search">在家园找一找</label>
        <input
          id="home-search"
          ref={search}
          type="search"
          placeholder="找课程、知识点或学习空间"
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              search.current?.focus();
            }}
          >
            清空搜索
          </button>
        )}
      </section>
      {searching ? (
        <section className="home-results" aria-label="家园搜索结果">
          <h2>找到了这些线索</h2>
          {spaces.map((s) =>
            s.available && s.href ? (
              <a className="home-result" key={s.id} href={s.href}>
                <span>学习空间</span>
                <b>{s.title}</b>
                <p>{s.description}</p>
                <MathIcon name="arrow" />
              </a>
            ) : (
              <div className="home-result pending-result" key={s.id}>
                <span>准备中</span>
                <b>{s.title}</b>
                <p>{s.description}</p>
              </div>
            ),
          )}
          {results.slice(0, 12).map((r) => (
            <a
              className="home-result"
              key={r.lesson.lessonId}
              href={"/subjects/math/lessons/" + r.lesson.lessonId}
            >
              <span>
                数学 / {termTitles[r.term]} / {r.unit?.title ?? r.bridge!.title}
              </span>
              <b>{r.lesson.title}</b>
              <p>{r.topic}</p>
              <MathIcon name="arrow" />
            </a>
          ))}
          {results.length > 12 && (
            <p className="home-more-results">
              还有 {results.length - 12} 节相关课。
              <a href={"/subjects/math?q=" + encodeURIComponent(query)}>
                到数学目录查看全部结果
              </a>
            </p>
          )}
          {!results.length && !spaces.length && (
            <div role="status">
              <p>
                还没找到这个内容。可以换一个关键词，或从下面的学习空间找起。
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  search.current?.focus();
                }}
              >
                回到学习空间
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <section
            className="home-spaces"
            id="learning-spaces"
            aria-labelledby="home-spaces-title"
          >
            <header className="home-section-heading">
              <div>
                <p>按自己的节奏</p>
                <h2 id="home-spaces-title">你的学习空间</h2>
              </div>
              <span>先选方向，再找课程</span>
            </header>
            <div className="home-space-grid">
              <article className="home-math-space" data-learning-space="math">
                <div className="home-space-heading">
                  <span className="home-space-icon">
                    <MathIcon name="book" size={27} />
                  </span>
                  <h3>数学书房</h3>
                </div>
                <p>
                  摆一摆，画一画，
                  <br />
                  把藏在问题里的关系想明白。
                </p>
                <a className="home-space-link" href="/subjects/math">
                  进入数学书房 <MathIcon name="arrow" size={22} />
                </a>
                <div className="mini-book-shelf" aria-hidden="true">
                  <span>图形</span>
                  <span>数量</span>
                  <span>关系</span>
                  <i />
                  <em>每一个“为什么”，都有不同的看法。</em>
                </div>
              </article>
              <article
                className="home-explore-space"
                data-learning-space="explore"
              >
                <div className="home-space-heading">
                  <span className="home-space-icon">
                    <MathIcon name="bulb" size={27} />
                  </span>
                  <h3>探索与创造</h3>
                </div>
                <p>
                  不急着得到答案。
                  <br />
                  留住好奇，试试自己的办法。
                </p>
                <a className="home-space-link" href="/explore">
                  打开探索本 <MathIcon name="arrow" size={22} />
                </a>
                <div className="home-question-note">
                  <span aria-hidden="true">?</span>
                  <p>
                    “如果换一种办法，
                    <br />
                    会发生什么？”
                  </p>
                  <small>从一个问题就可以开始</small>
                </div>
              </article>
            </div>
            {learningSpaces
              .filter(
                (s) =>
                  s.available && s.href && !["math", "explore"].includes(s.id),
              )
              .map((s) => (
                <a className="home-extra-space" key={s.id} href={s.href!}>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  <MathIcon name="arrow" />
                </a>
              ))}
          </section>
          <section className="home-books" aria-labelledby="home-books-title">
            <header className="home-section-heading">
              <div>
                <p>想从课本开始？</p>
                <h2 id="home-books-title">到书架选一本</h2>
              </div>
              <a href="/subjects/math">
                查看数学目录 <MathIcon name="arrow" size={18} />
              </a>
            </header>
            <div className="home-book-shelf">
              {books.map((b) => (
                <a
                  key={b.term}
                  data-term-link={b.term}
                  className={"home-book home-book-" + b.color}
                  href={"/subjects/math?term=" + b.term}
                >
                  <span className="home-book-cover">
                    <small>数学</small>
                    <b>
                      {b.term === "bridge" ? (
                        b.title
                      ) : (
                        <>
                          三年级
                          <br />
                          {b.term === "upper" ? "上册" : "下册"}
                        </>
                      )}
                    </b>
                    <span className="book-cover-geometry" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>{b.sub}</span>
                  </span>
                  <strong>{b.title}</strong>
                  <span className="home-book-hint">{b.hint}</span>
                  <span className="home-book-open">
                    翻开这本 <MathIcon name="arrow" size={18} />
                  </span>
                </a>
              ))}
            </div>
          </section>
          <section className="home-more" aria-labelledby="home-more-title">
            <header className="home-section-heading">
              <div>
                <p>学数学，也能换个玩法</p>
                <h2 id="home-more-title">用不一样的方法想一想</h2>
              </div>
            </header>
            <div className="home-ways">
              {[
                {
                  icon: "search",
                  title: "数学侦探",
                  hint: "找线索，检查自己的判断",
                  href: "/subjects/math/detective",
                },
                {
                  icon: "bulb",
                  title: "思维训练",
                  hint: "把一个想法讲清楚",
                  href: "/subjects/math/library?kind=thinking",
                },
                {
                  icon: "tools",
                  title: "方法工具箱",
                  hint: "遇到难题，换个角度",
                  href: "/subjects/math/library?kind=methods",
                },
              ].map((w) => (
                <a key={w.href} href={w.href}>
                  <MathIcon name={w.icon} size={29} />
                  <div>
                    <h3>{w.title}</h3>
                    <p>{w.hint}</p>
                  </div>
                  <MathIcon name="arrow" size={20} />
                </a>
              ))}
            </div>
          </section>
          <section
            className="home-curiosity"
            aria-labelledby="home-curiosity-title"
          >
            <div>
              <p>不在课本里的好奇，也值得留下</p>
              <h2 id="home-curiosity-title">脑子里冒出一个为什么？</h2>
              <p>
                先写自己的想法，再找观察和证据。
                <br />
                猜错了、还不知道，都可以继续。
              </p>
              <a href="/explore/questions">
                留下一个问题 <MathIcon name="arrow" size={20} />
              </a>
            </div>
            <a
              className="home-example-slip"
              href="/explore/projects?id=example-moon"
            >
              <span>一个公开示例</span>
              <strong>
                为什么月亮
                <br />
                看起来会变形？
              </strong>
              <small>
                看看问题可以怎样开始 <MathIcon name="arrow" size={18} />
              </small>
            </a>
          </section>
          <section className="home-coming" aria-labelledby="home-coming-title">
            <h2 id="home-coming-title">给新的学习空间留个位置</h2>
            <div>
              {learningSpaces
                .filter((s) => !s.available)
                .map((s) => (
                  <article key={s.id} aria-label={s.title + "，准备中"}>
                    <span aria-hidden="true">
                      {s.id === "english" ? "Aa" : "✦"}
                    </span>
                    <div>
                      <h3>
                        {s.title}
                        <small>准备中</small>
                      </h3>
                      <p>{s.description}</p>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        </>
      )}
      <p className="home-preview-note">
        免登录内容体验。当前操作刷新后清空，尚未接入真实学习记录。
      </p>
    </div>
  );
}
