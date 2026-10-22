import { Store } from "../../packages/platform/store.ts";
import { AuthService } from "../../packages/auth/service.ts";
import { authConfig } from "../../packages/auth/config.ts";
import { createHttp } from "../../apps/server/http.ts";
import { resolve } from "node:path";
if (process.env.NODE_ENV !== "test") throw Error("TEST_ONLY");
const store = new Store(process.argv[2]);
const origin = process.argv[3];
const server = createHttp(store, {
  webRoot: resolve("apps/web/dist"),
  origin,
  auth: {
    service: new AuthService(store),
    config: authConfig(origin, "loopback-development"),
  },
});
server.listen(Number(new URL(origin).port), "127.0.0.1", () =>
  process.send?.({ status: "ready" }),
);
process.on("SIGTERM", () =>
  server.close(() => {
    store.close();
    process.exit(0);
  }),
);
