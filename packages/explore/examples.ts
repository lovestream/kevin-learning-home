import {
  appendEvent,
  createProject,
  type ExploreEvent,
  type ExploreProject,
} from "./domain.ts";
// Authored public demonstrations. None represents an actual child or observation.
export const EXAMPLE_DATE = "2026-01-01T12:00:00.000Z";
export function examples(): ExploreProject[] {
  const rows = [
    ["moon", "为什么月亮看起来会变形？", "child", "pending"],
    ["box", "换一个方向看纸盒，会发现什么？", "lesson", "active"],
    ["bridge", "纸桥怎样能托住更多积木？", "child", "paused"],
    ["shadow", "影子总是朝着同一个方向吗？", "child", "uncertain"],
    ["english", "怎样用英语问出不同的问题？", "lesson", "archived"],
  ] as const;
  return rows.map(([id, question, origin, status], i) => {
    let project = createProject(
      {
        projectId: "example-" + id,
        learnerId: "demo-learner",
        questionId: "question-" + id,
        question,
        origin,
        subjectRefs:
          id === "box"
            ? [
                {
                  subjectId: "math",
                  contentId: "G3-U01-B01",
                  contentVersion: "2026-10-07.2",
                  relationship: "inspired-by",
                },
              ]
            : id === "english"
              ? [
                  {
                    subjectId: "english",
                    contentId: "CORE-demo",
                    contentVersion: "example-v1",
                    relationship: "inspired-by",
                  },
                ]
              : [],
      },
      EXAMPLE_DATE,
    );
    const add = (detail: ExploreEvent["detail"]) => {
      project = appendEvent(project, {
        recordVersion: 1,
        activityModule: "explore",
        eventId: id + "-" + project.revision,
        projectId: project.projectId,
        learnerId: project.learnerId,
        expectedRevision: project.revision,
        actor: "child",
        recordedAt: EXAMPLE_DATE,
        detail,
      });
    };
    if (i > 0)
      add({
        kind: "hypothesis_submitted",
        text:
          id === "shadow"
            ? "我猜影子一直在同一边。"
            : "我还不知道，想先画出两个不同的办法。",
        assistance: "none",
      });
    if (i > 1) {
      add({
        kind: "evidence_added",
        source: "observed",
        text:
          id === "shadow"
            ? "示例观察：换个方向放纸片，影子方向也变了。"
            : "示例观察：第一版纸桥弯了，暂时没有撑住。",
        inference: "这次结果和原来的预测不一样。",
        citation: "",
        artifactIds: [],
        assistance: "none",
      });
      add({
        kind: "hypothesis_revised",
        text: "原来的猜测不能解释所有情况，我想再换一个条件。",
        evidenceEventIds: [id + "-1"],
        assistance: "none",
      });
    }
    if (id === "english")
      add({
        kind: "artifact_created",
        category: "story",
        text: "示例故事：一位小旅行家用三个不同的问题认识新地方。",
        fictional: true,
        artifactIds: [],
        assistance: "none",
      });
    if (status !== "pending") add({ kind: "status_changed", status });
    return project;
  });
}
