import { mkdtemp } from "node:fs/promises";
import { createHarness } from "./harness.mjs";
import { runBusinessSuite } from "../../tests/platform-parity/business-suite.mjs";
const h = await createHarness({
  directory: await mkdtemp(process.cwd() + "/.bench-work-cf-"),
});
try {
  console.log(JSON.stringify(await runBusinessSuite(h)));
} finally {
  await h.close();
}
