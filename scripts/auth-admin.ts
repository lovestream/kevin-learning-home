// Offline, interactive, synthetic-only administration. No HTTP onboarding.
import { resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { Store } from "../packages/platform/store.ts";
import { layout, prepareLayout } from "../packages/platform/checkpoint.ts";
import { AuthService } from "../packages/auth/service.ts";
import { AppError } from "../packages/contracts/index.ts";

async function hidden(label: string): Promise<string> {
  const input = process.stdin;
  return new Promise((resolve, reject) => {
    let value = "";
    const decoder = new StringDecoder("utf8");
    const finish = (error?: Error) => {
      input.removeListener("data", data);
      input.setRawMode(false);
      input.pause();
      process.stderr.write("\n");
      error ? reject(error) : resolve(value);
      value = "";
    };
    const data = (chunk: Buffer) => {
      for (const c of decoder.write(chunk)) {
        if (c === "\u0003") {
          finish(new AppError("ADMIN_CANCELLED", 400));
          return;
        }
        if (c === "\r" || c === "\n") {
          finish();
          return;
        }
        if (c === "\u007f" || c === "\b")
          value = Array.from(value).slice(0, -1).join("");
        else if (c.charCodeAt(0) >= 32) value += c;
        if (value.length > 512) {
          finish(new AppError("INPUT_TOO_LONG", 422));
          return;
        }
      }
    };
    input.setRawMode(true);
    input.on("data", data);
    input.resume();
    process.stderr.write(label + ": ");
  });
}
let store: Store | undefined;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    try {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    } finally {
      store?.close();
      process.stderr.write(
        JSON.stringify({ status: "error", code: "ADMIN_CANCELLED" }) + "\n",
      );
      process.exit(signal === "SIGINT" ? 130 : 143);
    }
  });
try {
  const [action, ...args] = process.argv.slice(2);
  if (
    ![
      "bootstrap-parent",
      "create-learner",
      "grant-learner",
      "revoke-grant",
      "reset-credential",
      "rotate-authority",
    ].includes(action ?? "")
  )
    throw new AppError("ADMIN_ACTION_INVALID", 400);
  if (!process.stdin.isTTY || !process.stderr.isTTY)
    throw new AppError("INTERACTIVE_LOCAL_TTY_REQUIRED", 403);
  if (
    args.length !== 3 ||
    args[0] !== "--root" ||
    !args[1] ||
    args[2] !== "--synthetic"
  )
    throw new AppError("SYNTHETIC_LOCAL_ROOT_REQUIRED", 403);
  process.umask(0o077);
  const paths = layout(resolve(args[1]));
  prepareLayout(paths);
  store = new Store(paths.data);
  const auth = new AuthService(store);
  if (action === "bootstrap-parent") {
    const login = await hidden("Synthetic login"),
      label = await hidden("Synthetic label"),
      password = await hidden("New passphrase"),
      confirmation = await hidden("Confirm passphrase");
    if (password !== confirmation)
      throw new AppError("PASSPHRASE_CONFIRMATION", 422);
    await auth.bootstrap(login, label, password);
  } else if (action === "reset-credential" || action === "rotate-authority") {
    if ((await hidden("Type REVOKE ALL SESSIONS")) !== "REVOKE ALL SESSIONS")
      throw new AppError("OFFLINE_RESET_CONFIRMATION", 403);
    if (action === "rotate-authority") auth.rotateAuthority();
    else {
      const login = await hidden("Synthetic login"),
        password = await hidden("New passphrase"),
        confirmation = await hidden("Confirm passphrase");
      if (password !== confirmation)
        throw new AppError("PASSPHRASE_CONFIRMATION", 422);
      await auth.resetCredential(login, password);
    }
  } else {
    const parent = await auth.offlineParent(
      await hidden("Parent login"),
      await hidden("Parent passphrase"),
    );
    if (action === "create-learner") {
      const login = await hidden("Synthetic learner login"),
        label = await hidden("Synthetic learner label"),
        password = await hidden("New learner passphrase"),
        confirmation = await hidden("Confirm learner passphrase");
      if (password !== confirmation)
        throw new AppError("PASSPHRASE_CONFIRMATION", 422);
      await auth.provisionLearner(parent, login, label, password);
    } else {
      const learner = await hidden("Synthetic learner ID");
      if (action === "grant-learner") auth.grant(parent, learner);
      else auth.revokeGrant(parent, learner);
    }
  }
  console.log(JSON.stringify({ status: "ok", action, syntheticOnly: true }));
} catch (e) {
  console.error(
    JSON.stringify({
      status: "error",
      code: e instanceof AppError ? e.code : "ADMIN_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  store?.close();
}
