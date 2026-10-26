import { useState } from "react";
import type { Catalog } from "./contract.ts";
import {
  type LearningMap,
  type Term,
  type Entry,
  termTitles,
  mapHref,
  lessonHref,
  lessonLocation,
  trackOf,
  trackNames,
  searchLessons,
} from "./learning-map.ts";
function selection(map: LearningMap) {
  const p = new URLSearchParams(location.search),
    raw = p.get("term"),
    term = raw && Object.hasOwn(termTitles, raw) ? (raw as Term) : undefined;
  const unit =
    term === "bridge"
      ? map.bridgeGroups.find((x) => x.id === p.get("unit"))
      : map.units.find((x) => x.id === p.get("unit") && x.term === term);
  return { term, unitId: unit?.id, query: (p.get("q") ?? "").slice(0, 120) };
}
export function MapBreadcrumb({
  map,
  id,
  title,
}: {
  map: LearningMap;
  id?: string;
  title?: string;
}) {
  const at = id ? lessonLocation(map, id) : null,
    { term, unitId } = selection(map),
    u = map.units.find((x) => x.id === unitId),
    g = map.bridgeGroups.find((x) => x.id === unitId);
  const activeTerm = at?.term ?? term,
    unitTitle = at?.returnTitle ?? u?.title ?? g?.title,
    href = at?.returnHref ?? mapHref(term, unitId);
  return (
    <nav aria-label="当前位置" className="preview-breadcrumb">
      <a href="/">学习家园</a>
      <span>/</span>
      <a href="/subjects/math">数学</a>
      {activeTerm && (
        <>
          <span>/</span>
          <a href={mapHref(activeTerm)}>{termTitles[activeTerm]}</a>
        </>
      )}
      {unitTitle && (
        <>
          <span>/</span>
          <a href={href}>{unitTitle}</a>
        </>
      )}
      {id && (
        <>
          <span>/</span>
          <span aria-current="page">{title}</span>
        </>
      )}
    </nav>
  );
}
function LessonLink({ entry }: { entry: Entry }) {
  return (
    <a
      className="map-lesson-link"
      data-lesson-link={entry.lessonId}
      href={lessonHref(entry.lessonId)}
    >
      <span>{entry.title}</span>
      <small>
        {trackNames[trackOf(entry)]} ·{" "}
        {entry.interactionStatus === "verified" ? "动手探索" : "图示与纸笔"} ·
        draft
      </small>
    </a>
  );
}
export function CatalogPage({
  catalog,
  map,
}: {
  catalog: Catalog;
  map: LearningMap;
}) {
  const { term, unitId, query: initial } = selection(map),
    [query, setQuery] = useState(initial),
    byId = new Map(catalog.lessons.map((l) => [l.lessonId, l]));
  const unit = map.units.find((x) => x.id === unitId),
    bridge = map.bridgeGroups.find((x) => x.id === unitId),
    results = searchLessons(map, catalog, query);
  const update = (q: string) => {
    setQuery(q);
    const p = new URLSearchParams(location.search);
    if (q) p.set("q", q);
    else p.delete("q");
    history.replaceState(null, "", location.pathname + (p.size ? "?" + p : ""));
  };
  const entry = (id: string) => <LessonLink key={id} entry={byId.get(id)!} />;
  const groupNames = [
    ...new Set(
      unit?.sequence
        .filter((id) => !unit.supplemental.includes(id))
        .map((id) => trackOf(byId.get(id)!)),
    ),
  ];
  return (
    <section className="learning-map" data-learning-map>
      <header className="map-heading">
        <p className="intro-note">数学课本与知识地图</p>
        <h1>
          {unit?.title ??
            bridge?.title ??
            (term ? termTitles[term] : "从课本找到今天想学的内容")}
        </h1>
        {unit ? (
          <p>
            参考教材印刷页 {unit.printedPages} · {unit.sequence.length}{" "}
            节课。各课可自由进入，提升与思想课按兴趣选学。
          </p>
        ) : bridge ? (
          <p>
            {bridge.lessons.length}{" "}
            节基础衔接课，探索共同的数量关系；推荐先修不锁课。
          </p>
        ) : term === "upper" ? (
          <p>
            按教材顺序排列的 9 个单元、39 节课。展开单元，再从知识点进入课堂。
          </p>
        ) : term === "lower" ? (
          <p>
            按教材顺序排列的 8 个单元、24 节课。展开单元，再从知识点进入课堂。
          </p>
        ) : term === "bridge" ? (
          <p>4 个主题、7 节课，独立于教材单元；可从熟悉的问题自由开始。</p>
        ) : (
          <p>
            17 个教材单元，63 节课；另有 7
            节基础衔接。课堂保留六个短步骤与原教具。
          </p>
        )}
      </header>
      <div className="map-search">
        <label htmlFor="knowledge-search">找知识点或课程</label>
        <input
          id="knowledge-search"
          type="search"
          maxLength={120}
          value={query}
          onChange={(e) => update(e.target.value)}
          placeholder="试试：先乘除、分数、时刻与时长"
        />
        {query && (
          <a href={mapHref(term, unitId)}>
            退出搜索，返回
            {unit?.title ??
              bridge?.title ??
              (term ? termTitles[term] : "数学目录")}
          </a>
        )}
      </div>
      {query.trim() ? (
        <section aria-label="知识点搜索结果">
          <h2>找到 {results.length} 节课</h2>
          {results.length === 0 ? (
            <p role="status">
              没有找到对应知识点。换一个词试试，或退出搜索回到课本。
            </p>
          ) : (
            <ul className="map-search-results">
              {results.map((r) => (
                <li key={r.lesson.lessonId}>
                  <p>
                    {termTitles[r.term]} / {r.unit?.title ?? r.bridge!.title} /{" "}
                    {r.topic}
                  </p>
                  {entry(r.lesson.lessonId)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : !term ? (
        <div className="map-books" data-map-home>
          {(["upper", "lower", "bridge"] as const).map((t) => (
            <a
              data-term-link={t}
              className={"map-book map-book-" + t}
              key={t}
              href={mapHref(t)}
            >
              <span className="map-book-spine" aria-hidden="true" />
              <div>
                <h2>{termTitles[t]}</h2>
                <p>
                  {t === "upper"
                    ? "9 个单元 · 39 节课"
                    : t === "lower"
                      ? "8 个单元 · 24 节课"
                      : "4 个主题 · 7 节课"}
                </p>
                <span>
                  {t === "bridge"
                    ? "数量、分数、图形与等量关系"
                    : "沿教材顺序，从知识点进入课堂"}
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : term === "bridge" ? (
        <>
          <nav aria-label="基础衔接主题" className="map-unit-nav">
            {map.bridgeGroups.map((g) => (
              <a
                key={g.id}
                href={mapHref("bridge", g.id)}
                aria-current={bridge?.id === g.id ? "page" : undefined}
              >
                {g.title}
              </a>
            ))}
          </nav>
          {map.bridgeGroups
            .filter((g) => !bridge || g.id === bridge.id)
            .map((g) => (
              <section className="map-topic" key={g.id}>
                <h2>{g.title}</h2>
                <p>
                  基础衔接与数学思维，不属于教材某一单元。可自由选择课程，推荐先修不锁课。
                </p>
                <div className="map-lessons">{g.lessons.map(entry)}</div>
              </section>
            ))}
        </>
      ) : unit ? (
        <>
          <details className="map-switch">
            <summary>切换本册单元</summary>
            <nav aria-label="本册教材单元" className="map-unit-nav">
              {map.units
                .filter((u) => u.term === term)
                .map((u, i) => (
                  <a
                    key={u.id}
                    aria-current={u.id === unit.id ? "page" : undefined}
                    href={mapHref(term, u.id)}
                  >
                    {i + 1}. {u.title}
                  </a>
                ))}
            </nav>
          </details>
          {groupNames.map((track) => (
            <section className="map-track" key={track} data-track={track}>
              <h2>{trackNames[track]}</h2>
              {unit.coverage
                .map((c) => ({
                  topic: c.topic,
                  lessons: unit.sequence.filter(
                    (id) =>
                      c.lessons.includes(id) &&
                      trackOf(byId.get(id)!) === track,
                  ),
                }))
                .filter((c) => c.lessons.length)
                .map((c) => (
                  <section
                    className="map-topic"
                    key={c.topic}
                    data-topic={c.topic}
                  >
                    <h3>{c.topic}</h3>
                    <div className="map-lessons">{c.lessons.map(entry)}</div>
                  </section>
                ))}
            </section>
          ))}
          {unit.supplemental.length > 0 && (
            <section className="map-track map-supplement">
              <h2>补充拓展</h2>
              <p>原成品中的延伸课程，未列入原教材知识点表；保留原成品顺序。</p>
              <div className="map-lessons">{unit.supplemental.map(entry)}</div>
            </section>
          )}
          <p className="map-practice-note">
            练习在本课第六步“自己验证”中进入。当前探索不会保存成绩或发放积分。
          </p>
          <a href={mapHref(term)}>返回{termTitles[term]}单元目录</a>
        </>
      ) : (
        <div className="map-units" data-unit-list>
          {map.units
            .filter((u) => u.term === term)
            .map((u, i) => (
              <details className="map-unit" key={u.id} data-unit={u.id}>
                <summary>
                  <span className="map-unit-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h2>{u.title}</h2>
                    <p>
                      教材印刷页 {u.printedPages} · {u.sequence.length} 节课
                    </p>
                  </div>
                </summary>
                <div className="map-unit-overview">
                  <p>
                    {u.coverage
                      .slice(0, 3)
                      .map((x) => x.topic)
                      .join("；")}
                    {u.coverage.length > 3 ? "……" : ""}
                  </p>
                  <a className="map-open-unit" href={mapHref(term, u.id)}>
                    进入{u.title}知识点
                  </a>
                </div>
              </details>
            ))}
        </div>
      )}
      {term && (
        <p className="map-home-link">
          <a href="/subjects/math">返回上下册与基础衔接目录</a>
        </p>
      )}
    </section>
  );
}
