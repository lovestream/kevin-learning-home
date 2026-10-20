// Never copied into the production image. No test identity exists without this runner.
import { Store } from "../../packages/platform/store.ts";
import { createHttp } from "../../apps/server/http.ts";
if (process.env.NODE_ENV !== "test") throw Error("EXPLICIT_TEST_ENV_REQUIRED");
const port = Number(process.env.KLH_TEST_PORT),
  token = process.env.KLH_TEST_TOKEN;
if (!token) throw Error("TEST_TOKEN_REQUIRED");
const store = new Store(process.env.KLH_TEST_DATA!);
const server = createHttp(store, {
  webRoot: "apps/web/dist",
  origin: "http://127.0.0.1:" + port,
  testContext: (req) =>
    req.headers["x-foundation-test-session"] === token
      ? { learnerId: "synthetic-learner", sessionId: "child-test-session" }
      : null,
});
server.listen(port, "127.0.0.1", () => process.send?.({ ready: true }));
process.once("SIGTERM", () =>
  server.close(() => {
    store.close();
    process.exit(0);
  }),
);
