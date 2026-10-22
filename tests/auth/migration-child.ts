import { writeFileSync, openSync, fsyncSync, closeSync } from "node:fs";
import { Store } from "../../packages/platform/store.ts";
if (process.env.NODE_ENV !== "test") throw Error("TEST_ONLY");
const store = new Store(process.argv[2], { legacyMaintenance: true });
store.upgradeFromV1(() => {
  writeFileSync(process.argv[3], "in-flight");
  const fd = openSync(process.argv[3], "r");
  fsyncSync(fd);
  closeSync(fd);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
});
