import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
export async function nextMessage(
  child: ChildProcess,
  payload?: unknown,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      child.off("message", message);
      child.off("exit", exit);
    };
    const message = (value: unknown) => {
      cleanup();
      resolve(value);
    };
    const exit = () => {
      cleanup();
      reject(Error("CHILD_EXITED_BEFORE_REPLY"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(Error("CHILD_REPLY_TIMEOUT"));
    }, 10000);
    child.once("message", message);
    child.once("exit", exit);
    if (payload) child.send(payload);
  });
}
export async function startProcess(data: string, mode = "store") {
  const child = fork("tests/foundation/ownership-child.ts", [], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      KLH_R1_DATA: data,
      KLH_R1_MODE: mode,
    },
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  try {
    const initial = await nextMessage(child);
    if (
      initial.status === "blocked" &&
      child.exitCode === null &&
      child.signalCode === null
    )
      await once(child, "exit");
    return { child, initial: { ...initial, exitCode: child.exitCode } };
  } catch (e) {
    child.kill("SIGKILL");
    throw e;
  }
}
export async function stopProcess(
  child: ChildProcess,
  signal: NodeJS.Signals = "SIGTERM",
) {
  if (child.exitCode !== null || child.signalCode !== null)
    return { exitCode: child.exitCode, signal: child.signalCode };
  const done = once(child, "exit");
  child.kill(signal);
  const [exitCode, exitSignal] = await done;
  return { exitCode, signal: exitSignal };
}
