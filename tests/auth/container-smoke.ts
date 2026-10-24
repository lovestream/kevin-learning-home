// Called only by the existing modern-Linux CI image test. Never connects to NAS.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { request } from "node:http";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fixture } from "../foundation/helpers.ts";
import { AuthService } from "../../packages/auth/service.ts";
import { Store, LEGACY_TABLES } from "../../packages/platform/store.ts";
import {
  backup,
  restore,
  layout,
  type Layout,
} from "../../packages/platform/checkpoint.ts";
import { syntheticCommand } from "../../scripts/synthetic.ts";

export async function verifyContainerAuth(
  image: string,
  name: string,
  math = false,
) {
  const f = fixture(),
    password = randomBytes(24).toString("base64url"),
    auth = new AuthService(f.store);
  const parent = await auth.bootstrap(
    "synthetic-parent",
    "Synthetic parent",
    password,
  );
  auth.grant(parent, "synthetic-learner");
  f.store.command(syntheticCommand());
  const expected = f.store.summary();
  f.store.close();
  const origin = "https://klh-ci.invalid";
  let running = false,
    hostPort = "";
  const run = (args: string[]) =>
    execFileSync("docker", args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  const call = (
    method: string,
    path: string,
    cookie = "",
    csrf = "",
    body: unknown = {},
  ) =>
    new Promise<{ code: number; body: any; cookie: string; setCookie: string }>(
      (resolve, reject) => {
        const payload = JSON.stringify(body),
          r = request(
            "http://127.0.0.1:" + hostPort + path,
            {
              agent: false,
              method,
              headers: {
                Host: new URL(origin).host,
                ...(cookie ? { Cookie: cookie } : {}),
                ...(method === "POST"
                  ? {
                      Origin: origin,
                      "Content-Type": "application/json",
                      "Content-Length": String(Buffer.byteLength(payload)),
                      "X-CSRF-Token": csrf,
                    }
                  : {}),
              },
            },
            (res) => {
              let out = "";
              res.on("data", (b) => (out += b));
              res.on("end", () => {
                try {
                  const setCookie = res.headers["set-cookie"]?.[0] ?? "";
                  resolve({
                    code: res.statusCode!,
                    body: out ? JSON.parse(out) : null,
                    cookie: setCookie.split(";")[0] || cookie,
                    setCookie,
                  });
                } catch {
                  reject(Error("AUTH_CONTAINER_RESPONSE_INVALID"));
                }
              });
            },
          );
        r.on("error", reject);
        r.setTimeout(4000, () => r.destroy(Error("AUTH_CONTAINER_TIMEOUT")));
        r.end(method === "POST" ? payload : undefined);
      },
    );
  const ready = async () => {
    for (let i = 0; i < 100; i++) {
      try {
        hostPort = run(["port", name, "4177/tcp"]).trim().split(":").at(-1)!;
        if ((await call("GET", "/health/ready")).code === 200) {
          run(["exec", name, "node", "scripts/healthcheck.ts"]);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    throw Error("AUTH_CONTAINER_NOT_READY");
  };
  const launch = async (paths: Layout) => {
    run([
      "run",
      "-d",
      "--name",
      name,
      "--user",
      String(process.getuid!()) + ":" + String(process.getgid!()),
      "--read-only",
      "--init",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--memory",
      "512m",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m",
      "-p",
      "127.0.0.1::4177",
      "-e",
      "NODE_ENV=production",
      "-e",
      "KLH_AUTH_ORIGIN=" + origin,
      "-e",
      "KLH_AUTH_MODE=production",
      "-e",
      "KLH_MATH_READONLY=" + (math ? "1" : "0"),
      "-v",
      paths.data + ":/data:rw",
      "-v",
      paths.media + ":/media:ro",
      "-v",
      paths.content + ":/content:ro",
      image,
    ]);
    running = true;
    await ready();
  };
  const remove = () => {
    run(["rm", "-f", name]);
    running = false;
  };
  const login = () =>
    call("POST", "/api/v1/auth/login", "", "", {
      login: "synthetic-parent",
      password,
    });
  try {
    await launch(f.paths);
    assert.equal((await call("GET", "/api/v1/auth/session")).code, 401);
    const mathPath =
      "/api/v1/learners/synthetic-learner/subjects/math/lessons/G3-U01-B01";
    if (math) assert.equal((await call("GET", mathPath)).code, 401);
    let session = await login();
    assert.equal(session.code, 200);
    assert.match(session.setCookie, /; Secure/);
    assert.match(session.setCookie, /HttpOnly; SameSite=Strict/);
    if (math)
      assert.equal((await call("GET", mathPath, session.cookie)).code, 403);
    session = await call(
      "POST",
      "/api/v1/auth/parent-unlock",
      session.cookie,
      session.body.csrfToken,
      { password },
    );
    assert.equal(session.code, 200);
    assert.equal(session.body.parentUnlocked, true);
    if (math) {
      const lesson = await call("GET", mathPath, session.cookie);
      assert.equal(lesson.code, 200);
      assert.equal(lesson.body.lessonId, "G3-U01-B01");
      assert.equal(lesson.body.sourceStatus, "draft");
      assert.equal(lesson.body.mode, "readonly");
      assert.equal(lesson.body.manifest.externalAssets.length, 0);
      for (const method of ["HEAD", "POST", "PUT", "PATCH", "DELETE"])
        assert.equal((await call(method, mathPath, session.cookie)).code, 405);
      assert.equal(
        (await call("POST", "/api/studio/attempt", session.cookie)).code,
        403,
      );
      run([
        "exec",
        name,
        "node",
        "--input-type=module",
        "-e",
        "import{existsSync,readFileSync}from'node:fs';for(const p of ['/app/tests/math01','/app/scripts/math01','/app/content/pilot/lessons.json'])if(existsSync(p))process.exit(2);const html=readFileSync('/app/apps/web/dist/index.html','utf8');if(!html.includes('klh-math-visual-sha256'))process.exit(3);",
      ]);
    }
    const elevated = session;
    run(["restart", name]);
    await ready();
    if (math)
      assert.equal((await call("GET", mathPath, elevated.cookie)).code, 200);
    assert.equal(
      (await call("GET", "/api/v1/auth/session", elevated.cookie)).body
        .parentUnlocked,
      true,
    );
    remove();
    await launch(f.paths);
    if (math)
      assert.equal((await call("GET", mathPath, elevated.cookie)).code, 200);
    assert.equal(
      (await call("GET", "/api/v1/auth/session", elevated.cookie)).code,
      200,
    );
    assert.equal(
      (
        await call(
          "POST",
          "/api/v1/auth/logout",
          elevated.cookie,
          elevated.body.csrfToken,
          { allDevices: true },
        )
      ).code,
      200,
    );
    run(["restart", name]);
    await ready();
    assert.equal(
      (await call("GET", "/api/v1/auth/session", elevated.cookie)).code,
      401,
    );
    session = await login();
    assert.equal(session.code, 200);
    session = await call(
      "POST",
      "/api/v1/auth/parent-unlock",
      session.cookie,
      session.body.csrfToken,
      { password },
    );
    assert.equal(session.code, 200);
    run([
      "exec",
      name,
      "node",
      "--input-type=module",
      "-e",
      "import{accessSync}from'node:fs';accessSync('/app/scripts/auth-admin.ts');for(const path of ['/app/tests/auth','/app/tests/shell']){try{accessSync(path);process.exit(2);}catch{}}",
    ]);
    run(["stop", name]);
    remove();
    const source = new Store(f.paths.data);
    try {
      for (const table of LEGACY_TABLES)
        assert.deepEqual(source.summary()[table], expected[table]);
    } finally {
      source.close();
    }
    const checkpoint = join(f.root, "auth-checkpoint"),
      restored = join(f.root, "auth-restored");
    backup(f.paths, checkpoint);
    restore(checkpoint, restored);
    await launch(layout(restored));
    assert.equal(
      (await call("GET", "/api/v1/auth/session", session.cookie)).code,
      401,
    );
    const fresh = await login();
    assert.equal(fresh.code, 200);
    assert.equal(fresh.body.parentUnlocked, false);
    if (math)
      assert.equal((await call("GET", mathPath, fresh.cookie)).code, 403);
    assert.deepEqual(fresh.body.learnerIds, []);
    assert.equal(
      (await call("GET", "/api/v1/learners", fresh.cookie)).code,
      403,
    );
    const freshUnlock = await call(
      "POST",
      "/api/v1/auth/parent-unlock",
      fresh.cookie,
      fresh.body.csrfToken,
      { password },
    );
    assert.equal(freshUnlock.code, 200);
    assert.equal(freshUnlock.body.parentUnlocked, true);
    assert.deepEqual(freshUnlock.body.learnerIds, ["synthetic-learner"]);
    if (math)
      assert.equal((await call("GET", mathPath, freshUnlock.cookie)).code, 200);
    remove();
    const verified = new Store(layout(restored).data);
    try {
      for (const table of [
        ...LEGACY_TABLES,
        "actors",
        "learner_grants",
      ] as const)
        assert.deepEqual(verified.summary()[table], expected[table]);
    } finally {
      verified.close();
    }
    mkdirSync(math ? ".evidence/math-01" : ".evidence", { recursive: true });
    writeFileSync(
      math
        ? ".evidence/math-01/container.json"
        : ".evidence/auth-container.json",
      JSON.stringify(
        {
          status: "PASS_CI",
          executedHeadSha: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          scope:
            "modern Linux amd64; internal loopback HTTP models TLS termination, TLS separately tested by auth HTTPS fixture; never NAS",
          productionEntry: true,
          secureCookie: true,
          nonRoot: true,
          readOnlyRootfs: true,
          authEnabledRestartPersistent: true,
          killRecreatePersistent: true,
          logoutSurvivesRestart: true,
          backupRestoreRevokesSessions: true,
          restoredCredentialsAndGrantWork: true,
          lockedParentScopeHidden: true,
          restoredGrantVisibleOnlyAfterUnlock: true,
          allLegacyTablesPreserved: true,
          authAdminPresent: true,
          authHarnessExcluded: true,
          shellHarnessExcluded: true,
          ...(math
            ? {
                mathReadonlyEnabled: true,
                realParentSessionAndGrant: true,
                sourceAndBuiltAssetHashesValidated: true,
                courseSurvivesRestartAndRecreate: true,
                allMathWritesClosed: true,
                courseRestoredOnlyAfterFreshUnlock: true,
                mathImportAndBrowserHarnessExcluded: true,
              }
            : {}),
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    if (running)
      try {
        remove();
      } catch {}
    f.close();
  }
}
