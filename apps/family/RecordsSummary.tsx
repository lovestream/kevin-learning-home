import { useEffect, useState } from "react";
import type { RecordsSummary as Summary } from "../../packages/records/summary.ts";
import { request, PrivateAPIError, type FamilySession } from "./client.ts";

export default function RecordsSummary({session, learner, onDenied}: {session: FamilySession; learner: string; onDenied: () => void}) {
  const [summary, setSummary] = useState<Summary | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setSummary(null);setFailed(false);
    request<Summary>("/parent/learners/" + learner + "/records", {session, signal: controller.signal})
      .then(value => {if (active) setSummary(value);})
      .catch(error => {if (!active) return;if (error instanceof PrivateAPIError && [401, 403].includes(error.status)) onDenied();else setFailed(true);});
    return () => {active = false;controller.abort();};
  }, [learner, session.csrf, onDenied]);
  return <section aria-label="各科记录保全情况" className="weekly-review">
    <h2>同一份学习档案，各科分别保留</h2>
    <p>这里统计保存的记录，不代表答对或掌握。旧积分和蛋仔历史暂存，不合并、不补发积分。</p>
    {failed ? <p role="alert">记录概况暂未读出，请重新打开家长查看。原记录不会被清空。</p> : !summary ? <p role="status">正在核对各科记录…</p> : <>
      {summary.subjects.map(s => <article key={s.subjectId}>
        <h3>{s.subjectId === "math" ? "数学" : "英语"}</h3>
        {!s.available ? <p>尚未接入保存的记录。</p> : s.archiveOnly ? <p>原文已保全，存在需要核对的旧格式；暂不生成学习结论。</p> : <>
          <p>保存修订 {s.revision} · 来源版本 {s.contentVersion}</p>
          {s.subjectId === "math" ? <p>阅读 {s.counts?.reading ?? 0} 项，练习会话 {s.counts?.sessions ?? 0} 组，思维卡 {s.counts?.thinking ?? 0} 张，侦探自主解题 {s.counts?.detectiveAttempts ?? 0} 次。</p> : <p>词条记录 {s.counts?.words ?? 0} 条，待匹配旧词 {s.counts?.unresolvedWords ?? 0} 条，逐题作答事件 {s.counts?.attemptEvents ?? 0} 条。</p>}
          <p>不可变来源快照 {s.snapshotCount} 份，原科目复习日期线索 {s.reviewReferenceCount} 条；复习是否可开始仍由各科学习规则决定。</p>
          {s.historicalSummaryOnly && <p>这是英语 V1 历史汇总，不能还原成不存在的逐题首答。</p>}
        </>}
      </article>)}
      <p>探索与创造：{summary.exploration.projects} 个项目，{summary.exploration.events} 条过程记录。</p>
    </>}
  </section>;
}
