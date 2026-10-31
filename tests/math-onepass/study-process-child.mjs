import { MathTrainingRepository } from "../../packages/math-training/repository.ts";
process.env.NODE_ENV = "test";
const repo = new MathTrainingRepository(process.argv[2]);
repo.studyDispatch("synthetic-process", "note", {
  id: "synthetic-persist-note",
  lessonId: "G3-U01-B01",
  text: "合成重启证据：物体不动，改变观察方向。",
});
repo.studyDispatch("synthetic-process", "reading", {
  lessonId: "G3-U01-B01",
  revision: 0,
  blockId: "classroom",
  widgets: { classroom: { parentMode: true } },
});
process.send?.({ phase: "committed" });
setInterval(() => {}, 1000);
