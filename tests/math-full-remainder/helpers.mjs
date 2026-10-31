import { orderedReasons } from "../../apps/preview/library/service.ts";
export const detectiveSubmission = (row) => {
  const c = row.content,
    answer = {
      verdict: c.verdict,
      errorStep: c.errorStep,
      reason: "r" + orderedReasons(row).findIndex((x) => x.index === c.reason),
      repair: c.repair.answer,
      verify: c.verify.answer,
    };
  return {
    caseId: row.id,
    firstAnswer: answer,
    checks: [true, true, true],
    finalAnswer: answer,
  };
};
