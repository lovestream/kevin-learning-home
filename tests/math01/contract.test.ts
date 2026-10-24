import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  realpathSync,
  cpSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  mathLessonSchema,
  mathResponseSchema,
  PUBLIC_DTO_SHA,
} from "../../packages/contracts/math-readonly.ts";
import { canonical, sha256 } from "../../packages/contracts/index.ts";
import { projectSourceLesson } from "../../packages/subjects/math/project.ts";
import {
  MathLessonService,
  mathReadonlyFlag,
} from "../../packages/subjects/math/service.ts";
import { composeSolid, boxFaces } from "../../apps/web/src/math/geometry.mjs";
import { verifyMathResponse } from "../../apps/web/src/math/verify.ts";
const publicLesson = JSON.parse(
  readFileSync("packages/subjects/math/public-lesson.json", "utf8"),
);
const service = () => new MathLessonService(resolve("apps/web/dist"));
const SENTINEL = "MATH01_SYNTHETIC_ANSWER_SENTINEL_NOT_FOR_CLIENT";
function authoredFixture() {
  const l = publicLesson.lesson;
  return {
    lessonId: publicLesson.lessonId,
    contentVersion: publicLesson.contentVersion,
    editorialRevision: publicLesson.editorialRevision,
    status: "draft",
    title: l.title,
    question: l.question,
    subtitle: l.subtitle,
    objectives: l.objectives.map((o: object) => ({ ...o, expected: SENTINEL })),
    childClassroom: {
      ...l.classroom,
      storyVisual: l.intro,
      predictionVisual: l.predictionIntro,
      expectedEvidence: SENTINEL,
      unknown: { secret: SENTINEL },
    },
    conceptScenes: [
      {
        sceneId: l.spatial.sceneId,
        handsOnSpec: l.spatial,
        expectedExplanation: SENTINEL,
      },
    ],
    taskSets: { core: [{ expected: SENTINEL, solution: SENTINEL }] },
    articleBlocks: [{ referenceAnswer: SENTINEL }],
    unknown: SENTINEL,
    wallet: { coins: 100 },
  };
}
test("M01 A02/A05 explicit one-lesson projection matches reviewed public canonical digest and strips nested synthetic answer sentinels", () => {
  const p = projectSourceLesson(authoredFixture());
  assert.equal(sha256(canonical(p)), PUBLIC_DTO_SHA);
  assert.equal(JSON.stringify(p).includes(SENTINEL), false);
  assert.deepEqual(p, publicLesson);
});
test("M01 A05 unknown public DTO fields and deep expectedEvidence are rejected; source version never follows latest", () => {
  const p = structuredClone(publicLesson);
  p.lesson.classroom.expectedEvidence = SENTINEL;
  assert.equal(mathLessonSchema.safeParse(p).success, false);
  const tooLong = structuredClone(publicLesson);
  tooLong.lesson.title = "x".repeat(161);
  assert.equal(mathLessonSchema.safeParse(tooLong).success, false);
  const s = authoredFixture();
  s.contentVersion = "latest";
  assert.throws(() => projectSourceLesson(s));
  const d = service().get("synthetic-child");
  assert.equal(
    mathResponseSchema.safeParse({ ...d, unknown: SENTINEL }).success,
    false,
  );
});
test("M01 A02 service and browser validate source/public/build hashes and learner binding", async () => {
  const d = service().get("synthetic-child");
  assert.equal(
    (
      await verifyMathResponse(
        d,
        "synthetic-child",
        d.manifest.visualArtifactSha256,
      )
    ).lessonId,
    "G3-U01-B01",
  );
  await assert.rejects(
    verifyMathResponse(d, "other-child", d.manifest.visualArtifactSha256),
  );
  await assert.rejects(
    verifyMathResponse(d, "synthetic-child", "0".repeat(64)),
  );
  const fake = structuredClone(d);
  fake.lesson.title = "Synthetic altered lesson";
  await assert.rejects(
    verifyMathResponse(
      fake,
      "synthetic-child",
      d.manifest.visualArtifactSha256,
    ),
  );
});
test("M01 A02 corrupted public data, schema, manifest source, visual hash and missing asset fail closed without fallback", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-hashes-")));
  try {
    const data = join(root, "data"),
      web = join(root, "web");
    cpSync("packages/subjects/math", data, { recursive: true });
    cpSync("apps/web/dist", web, { recursive: true });
    const f = new MathLessonService(web, data),
      original = readFileSync(join(data, "public-lesson.json"));
    assert.equal(f.get("synthetic").lessonId, "G3-U01-B01");
    writeFileSync(
      join(data, "public-lesson.json"),
      original.toString().replace("draft", "published"),
    );
    assert.throws(() => f.get("synthetic"), /CONTENT_UNAVAILABLE/);
    writeFileSync(join(data, "public-lesson.json"), original);
    const file = join(web, "math-integrity.json"),
      originalManifest = readFileSync(file),
      m = JSON.parse(originalManifest.toString());
    for (const key of [
      "sourceCommit",
      "sourceArtifactSha256",
      "publicDtoSha256",
      "visualArtifactSha256",
    ]) {
      const changed = structuredClone(m);
      changed[key] = "0".repeat(key === "sourceCommit" ? 40 : 64);
      writeFileSync(file, JSON.stringify(changed));
      assert.throws(() => f.get("synthetic"), /CONTENT_UNAVAILABLE/);
    }
    writeFileSync(file, originalManifest);
    const incomplete = structuredClone(m);
    incomplete.files.pop();
    incomplete.visualArtifactSha256 = sha256(canonical(incomplete.files));
    writeFileSync(file, JSON.stringify(incomplete));
    assert.throws(() => f.get("synthetic"), /CONTENT_UNAVAILABLE/);
    writeFileSync(file, originalManifest);
    writeFileSync(join(web, m.files[0].path), "corrupted");
    assert.throws(() => f.get("synthetic"), /CONTENT_UNAVAILABLE/);
    rmSync(join(web, m.files[0].path));
    assert.throws(() => f.get("synthetic"), /CONTENT_UNAVAILABLE/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("M01 A07 exact selected geometry matches frozen pure-snippet golden fixture for front/right/top/isometric", () => {
  const golden = JSON.parse(
    readFileSync("tests/math01/geometry-golden.json", "utf8"),
  );
  const round = (v: unknown) =>
    JSON.parse(
      JSON.stringify(v, (_, x) =>
        typeof x === "number" ? Math.round(x * 1e9) / 1e9 : x,
      ),
    );
  for (const c of golden.cases)
    assert.deepEqual(
      round(composeSolid(boxFaces(2.4, 1.5, 1.2), c.azimuth, c.elevation)),
      c.result,
    );
});
test("M01 A01/A05 emitted client assets contain no public lesson text, bank, synthetic sentinel or raw static resources; import tool not in runtime bundle", () => {
  const build = JSON.parse(
    readFileSync("apps/web/dist/math-integrity.json", "utf8"),
  );
  for (const f of build.files) {
    const text = readFileSync("apps/web/dist/" + f.path, "utf8");
    for (const secret of [
      publicLesson.lesson.title,
      publicLesson.lesson.question,
      SENTINEL,
      "math-paper-folding",
      "grade3-complete.mjs",
      "bootstrap-parent",
    ])
      assert.equal(text.includes(secret), false);
  }
});
test("M01 A06 feature flag defaults closed and rejects ambiguous values", () => {
  assert.equal(mathReadonlyFlag(undefined), false);
  assert.equal(mathReadonlyFlag("0"), false);
  assert.equal(mathReadonlyFlag("1"), true);
  assert.throws(() => mathReadonlyFlag("true"), /MATH_FLAG_INVALID/);
});
