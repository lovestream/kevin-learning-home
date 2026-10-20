import { resolve } from "node:path";
import {
  layout,
  prepareLayout,
  backup,
  restore,
} from "../packages/platform/checkpoint.ts";
import { Store } from "../packages/platform/store.ts";
import { AppError } from "../packages/contracts/index.ts";

const [action, ...args] = process.argv.slice(2);
const argument = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--"))
    throw new AppError("MISSING_" + name.slice(2).toUpperCase(), 400);
  return resolve(args[index + 1]);
};
try {
  let result: unknown;
  if (action === "restore")
    result = restore(argument("--from"), argument("--to"));
  else {
    const paths = layout(argument("--root"));
    if (action === "backup") result = backup(paths, argument("--out"));
    else if (action === "migrate" || action === "seed") {
      if (action === "seed" && !args.includes("--synthetic"))
        throw new AppError("SYNTHETIC_FLAG_REQUIRED", 403);
      prepareLayout(paths);
      const store = new Store(paths.data);
      try {
        if (action === "seed") {
          const { seed } = await import("./synthetic.ts");
          seed(store, paths);
        }
        result = {
          schemaVersion: 1,
          environment: store.environment(),
          tables: store.summary(),
        };
      } finally {
        store.close();
      }
    } else throw new AppError("UNKNOWN_MAINTENANCE_ACTION", 400);
  }
  console.log(JSON.stringify({ status: "ok", action, result }));
} catch (e) {
  console.error(
    JSON.stringify({
      status: "error",
      code: e instanceof AppError ? e.code : "MAINTENANCE_FAILED",
    }),
  );
  process.exitCode = 1;
}
