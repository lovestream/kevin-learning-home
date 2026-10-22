import { AuthService } from "../../packages/auth/service.ts";
import { authConfig } from "../../packages/auth/config.ts";
import { resolve } from "node:path";
import { constants, accessSync, lstatSync } from "node:fs";
import { Store } from "../../packages/platform/store.ts";
import { createHttp } from "./http.ts";
import { AppError } from "../../packages/contracts/index.ts";

const host = process.env.KLH_HOST ?? "127.0.0.1",
  port = Number(process.env.KLH_PORT ?? 4177);
if (process.getuid?.() === 0) throw new AppError("NON_ROOT_REQUIRED", 503);
if (
  !["127.0.0.1", "0.0.0.0"].includes(host) ||
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535
)
  throw new AppError("LISTEN_CONFIG_INVALID", 503);
if (host === "0.0.0.0" && process.env.KLH_CONTAINER !== "1")
  throw new AppError("CONTAINER_BIND_REQUIRED", 503);
// NODE_ENV cannot turn the production entry point into a synthetic API server.
if (process.env.NODE_ENV === "test")
  throw new AppError("PRODUCTION_ENTRY_REJECTS_TEST_MODE", 503);
const data = resolve(process.env.KLH_DATA_DIR ?? ".foundation-work/data");
const media = resolve(process.env.KLH_MEDIA_DIR ?? ".foundation-work/media"),
  content = resolve(process.env.KLH_CONTENT_DIR ?? ".foundation-work/content");
function directoriesReady() {
  for (const path of [media, content]) {
    if (!lstatSync(path).isDirectory() || lstatSync(path).isSymbolicLink())
      throw new AppError("VOLUME_DIRECTORY_INVALID", 503);
    accessSync(path, constants.R_OK | constants.X_OK);
  }
}
process.umask(0o077);
let store: Store | undefined;
try {
  directoriesReady();
  store = new Store(data);
  const config = process.env.KLH_AUTH_ORIGIN
    ? authConfig(
        process.env.KLH_AUTH_ORIGIN,
        (process.env.KLH_AUTH_MODE ?? "production") as
          "production" | "loopback-development",
      )
    : undefined;
  if (
    config?.mode === "loopback-development" &&
    (host !== "127.0.0.1" || process.env.KLH_CONTAINER === "1")
  )
    throw new AppError("AUTH_TRANSPORT_CONFIG", 503);
  const server = createHttp(store, {
    webRoot: resolve(process.env.KLH_WEB_DIR ?? "apps/web/dist"),
    origin:
      config?.origin ??
      process.env.KLH_INTERNAL_ORIGIN ??
      "http://127.0.0.1:" + port,
    ...(config ? { auth: { service: new AuthService(store), config } } : {}),
    readiness: directoriesReady,
  });
  server.on("error", () => {
    store?.close();
    console.error(JSON.stringify({ error: "LISTEN_FAILED" }));
    process.exitCode = 1;
  });
  server.listen(port, host, () =>
    console.log(
      JSON.stringify({
        event: "ready",
        schemaVersion: store!.schemaVersion,
        learningEnabled: false,
      }),
    ),
  );
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () =>
      server.close(() => {
        store?.close();
        process.exit(0);
      }),
    );
} catch (e) {
  store?.close();
  console.error(
    JSON.stringify({
      error: e instanceof AppError ? e.code : "STARTUP_FAILED",
    }),
  );
  process.exitCode = 1;
}
