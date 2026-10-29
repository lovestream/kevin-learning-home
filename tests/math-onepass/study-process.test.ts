import test from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MathTrainingRepository } from "../../packages/math-training/repository.ts";
test("real SIGKILL: synthetic SQLite WAL, held flock, committed reading/notes and scoped logical restore survive process replacement", async () => {
  process.env.NODE_ENV = "test";
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-review-"))),
    restored = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-review-")));
  const child = fork("tests/math-onepass/study-process-child.mjs", [dir], {
    silent: true,
  });
  let a: MathTrainingRepository | undefined,
    b: MathTrainingRepository | undefined;
  try {
    await Promise.race([
      once(child, "message"),
      once(child, "exit").then(() => {
        throw Error("CHILD_EXIT_BEFORE_COMMIT");
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("COMMIT_TIMEOUT")), 5000).unref(),
      ),
    ]);
    assert.throws(() => new MathTrainingRepository(dir));
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
    a = new MathTrainingRepository(dir);
    const state = a.studyState("synthetic-process") as {
      studio: {
        notes?: { text: string }[];
        reading?: Record<string, { revision: number }>;
      };
    };
    assert.equal(state.studio.notes?.length, 1);
    assert.equal(state.studio.reading?.["G3-U01-B01"].revision, 1);
    const backup = a.studyBackup("synthetic-process");
    b = new MathTrainingRepository(restored);
    b.studyRestore("synthetic-process", backup);
    assert.deepEqual(b.studyBackup("synthetic-process"), backup);
    assert.throws(() => b!.studyRestore("synthetic-other", backup));
    assert.equal(
      (b.studyState("synthetic-other").studio.notes as unknown[]).length,
      0,
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
    a?.close();
    b?.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(restored, { recursive: true, force: true });
  }
});
