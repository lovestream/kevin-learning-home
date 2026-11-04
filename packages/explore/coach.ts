import { firstHypothesis, type ExploreProject } from "./domain.ts";
export type CoachLevel = "ask-back" | "idea" | "study-source" | "review-help";
export type CoachResponse = {
  kind: "question" | "evidenceRequest" | "alternativeView" | "safetyBoundary";
  text: string;
  source: "offline-template";
  externalRequests: 0;
};
export interface ExplorationCoach {
  respond(project: ExploreProject, level: CoachLevel): CoachResponse;
}
export const deterministicCoach: ExplorationCoach = {
  respond(project, level) {
    const unsafe =
      /明火|点火|火柴|打火机|插座|触电|高压|电池|药物|农药|锐器|刀片|化学|漂白|爆炸|解剖|割伤|爬高|火焰|生火|electric|bleach|medicine|knife|battery|fire\b/i.test(
        project.question,
      );
    const first = firstHypothesis(project);
    const response: CoachResponse = {
      kind: "question",
      source: "offline-template",
      externalRequests: 0,
      text: "你自己先猜一猜，或者写下“我还不知道”。",
    };
    if (unsafe)
      return {
        ...response,
        kind: "safetyBoundary",
        text: "先停下动手操作，请家长一起判断安全。可以改成画图、观察已有图片或用纸模型比较，不独自碰火、电、药物或锐器。",
      };
    if (!first) return response;
    if (level === "idea")
      return {
        ...response,
        kind: "alternativeView",
        text: "只换一个条件，再比较两次结果。你想先换哪一个？也可以先画两张预测图。",
      };
    if (level === "study-source")
      return {
        ...response,
        kind: "evidenceRequest",
        text: "找一份能说明出处的书或资料。分别记下“资料说了什么”和“我亲自看到了什么”；资料也可能需要核对。",
      };
    if (level === "review-help")
      return {
        ...response,
        kind: "alternativeView",
        text: "哪条证据不支持你最初的想法？还有没有另一种解释？证据不够时，可以留下“暂时不知道”。",
      };
    return {
      ...response,
      text: "如果反过来想，什么现象会让你改变猜想？你准备怎样安全地找这个反例？",
    };
  },
};
export function externalCoach(): never {
  throw Error("EXTERNAL_AI_DISABLED_REQUIRES_SEPARATE_CONSENT");
}
