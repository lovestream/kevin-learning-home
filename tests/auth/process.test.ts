import test from "node:test";
import assert from "node:assert/strict";
import { fork, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync } from "node:fs";
import { Store } from "../../packages/platform/store.ts";
import { once } from "node:events";
import { resolve } from "node:path";
import { request } from "node:http";
import { fixture, port } from "../foundation/helpers.ts";
import { AuthService } from "../../packages/auth/service.ts";
import { secret } from "./helpers.ts";
import { hashPassword } from "../../packages/auth/password.ts";
test("A04/A10 actual authenticated HTTP survives child SIGKILL; logged-out session remains revoked after second restart", async () => {
  process.env.NODE_ENV = "test";
  const f = fixture();
  let child: ChildProcess | undefined;
  const password = secret();
  await new AuthService(f.store).bootstrap(
    "synthetic-parent",
    "Synthetic",
    password,
  );
  f.store.close();
  const n = await port(),
    origin = "http://127.0.0.1:" + n;
  const start = async () => {
    child = fork(resolve("tests/auth/auth-child.ts"), [f.paths.data, origin], {
      env: { ...process.env, NODE_ENV: "test" },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const ready = once(child, "message");
    const fail = once(child, "exit").then(() => {
      throw Error("AUTH_CHILD_EARLY_EXIT");
    });
    await Promise.race([
      ready,
      fail,
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("AUTH_CHILD_TIMEOUT")), 10000).unref(),
      ),
    ]);
  };
  const call = (
    method: string,
    path: string,
    cookie = "",
    csrf = "",
    body: unknown = {},
  ) =>
    new Promise<{ code: number; body: any; cookie: string }>(
      (resolve, reject) => {
        const payload = JSON.stringify(body),
          r = request(
            origin + path,
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
            (s) => {
              let out = "";
              s.on("data", (b) => (out += b));
              s.on("end", () =>
                resolve({
                  code: s.statusCode!,
                  body: JSON.parse(out),
                  cookie: s.headers["set-cookie"]?.[0].split(";")[0] ?? cookie,
                }),
              );
            },
          );
        r.on("error", reject);
        r.end(method === "POST" ? payload : undefined);
      },
    );
  const kill = async () => {
    const p = child!;
    const done = once(p, "exit");
    p.kill("SIGKILL");
    const [, signal] = await done;
    assert.equal(signal, "SIGKILL");
    child = undefined;
  };
  try {
    await start();
    const login = await call("POST", "/api/v1/auth/login", "", "", {
      login: "synthetic-parent",
      password,
    });
    assert.equal(login.code, 200);
    await kill();
    await start();
    assert.equal(
      (await call("GET", "/api/v1/auth/session", login.cookie)).code,
      200,
    );
    assert.equal(
      (
        await call(
          "POST",
          "/api/v1/auth/logout",
          login.cookie,
          login.body.csrfToken,
        )
      ).code,
      200,
    );
    await kill();
    await start();
    assert.equal(
      (await call("GET", "/api/v1/auth/session", login.cookie)).code,
      401,
    );
  } finally {
    if (child) {
      const done = once(child, "exit");
      child.kill("SIGTERM");
      await done;
    }
    f.close();
  }
});
test("A08 KDF work admission is bounded and never replaces persistent auth state", async () => {
  const jobs = await Promise.allSettled([
    hashPassword(secret()),
    hashPassword(secret()),
    hashPassword(secret()),
  ]);
  assert.equal(jobs.filter((r) => r.status === "fulfilled").length, 2);
  const rejected = jobs.find((r) => r.status === "rejected");
  assert(
    rejected?.status === "rejected" && rejected.reason.code === "AUTH_BUSY",
  );
});

test("A07 real production entry rejects HTTP development mode on a container network bind", () => {
  const f = fixture();
  f.store.close();
  try {
    const r = spawnSync(process.execPath, ["apps/server/main.ts"], {
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        NODE_ENV: "development",
        KLH_CONTAINER: "1",
        KLH_HOST: "0.0.0.0",
        KLH_AUTH_MODE: "loopback-development",
        KLH_AUTH_ORIGIN: "http://127.0.0.1:4177",
        KLH_DATA_DIR: f.paths.data,
        KLH_MEDIA_DIR: f.paths.media,
        KLH_CONTENT_DIR: f.paths.content,
      },
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /AUTH_TRANSPORT_CONFIG/);
    const s = new Store(f.paths.data);
    s.close();
  } finally {
    f.close();
  }
});
test("A08 credential database directory must be private without automatic permission changes", () => {
  const f = fixture();
  f.store.close();
  try {
    chmodSync(f.paths.data, 0o755);
    assert.throws(
      () => new Store(f.paths.data),
      /DATA_DIRECTORY_PRIVATE_REQUIRED/,
    );
  } finally {
    chmodSync(f.paths.data, 0o700);
    f.close();
  }
});
