// Isolated synthetic test process, never copied into the runtime image.
import { DatabaseSync } from "node:sqlite";
import { Store } from "../../packages/platform/store.ts";
import {
  AppError,
  type LearningCommand,
} from "../../packages/contracts/index.ts";
if (process.env.NODE_ENV !== "test") throw Error("EXPLICIT_TEST_ENV_REQUIRED");
let store: Store | undefined, raw: DatabaseSync | undefined;
try {
  if (process.env.KLH_R1_MODE === "raw-sqlite-lock") {
    raw = new DatabaseSync(process.env.KLH_R1_DATA + "/learning.sqlite");
    raw.exec("BEGIN IMMEDIATE");
  } else store = new Store(process.env.KLH_R1_DATA!);
  process.on(
    "message",
    (m: { operation: string; command?: LearningCommand }) => {
      try {
        if (m.operation === "command")
          process.send?.({ status: "ok", result: store!.command(m.command!) });
        else if (m.operation === "snapshot") {
          store!.verifyIntegrity();
          process.send?.({
            status: "ok",
            tables: store!.summary(),
            environment: store!.environment(),
          });
        }
      } catch (e) {
        process.send?.({
          status: "error",
          code: e instanceof AppError ? e.code : "TEST_OPERATION_FAILED",
        });
      }
    },
  );
  process.send?.({ status: "ready" });
  process.once("SIGTERM", () => {
    store?.close();
    raw?.close();
    process.exit(0);
  });
} catch (e) {
  process.send?.(
    {
      status: "blocked",
      code: e instanceof AppError ? e.code : "TEST_STARTUP_FAILED",
    },
    () => process.exit(1),
  );
}
