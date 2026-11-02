import { PageCommands } from "../commands.ts";
import { useEffect, useRef, useState } from "react";
import { z } from "../validation.ts";
const session = z.object({
  id: z.string(),
  revision: z.number().int(),
  taskIds: z.array(z.string()),
});
export function usePracticeJourney(lessonId: string, enabled: boolean) {
  const commands = useRef(new PageCommands());
  const cap = useRef(""),
    active = useRef(new Map<string, z.infer<typeof session>>()),
    pending = useRef(false),
    [ready, setReady] = useState(!enabled),
    [help, setHelp] = useState<
      Record<string, { kind: string; text: string }[]>
    >({}),
    [error, setError] = useState("");
  async function request(path: string, body: unknown) {
    const r = await fetch("/preview-api/v1/training/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify(body),
      }),
      v: unknown = await r.json();
    if (!r.ok)
      throw Object.assign(
        Error(
          z.object({ message: z.string().optional() }).parse(v).message ??
            "这次操作未能封存，请重试。",
        ),
        { status: r.status },
      );
    return v;
  }
  useEffect(() => {
    if (!enabled) return;
    let alive = true,
      token = "";
    active.current.clear();
    setReady(false);
    void request("start", {})
      .then((v) => {
        token = z.object({ capability: z.string() }).parse(v).capability;
        if (alive) {
          cap.current = token;
          setReady(true);
        } else void request("release", { capability: token });
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    const release = () => {
      if (token)
        navigator.sendBeacon(
          "/preview-api/v1/training/release",
          new Blob([JSON.stringify({ capability: token })], {
            type: "application/json",
          }),
        );
    };
    window.addEventListener("pagehide", release);
    return () => {
      alive = false;
      window.removeEventListener("pagehide", release);
      if (token) void request("release", { capability: token }).catch(() => {});
      cap.current = "";
    };
  }, [lessonId, enabled]);
  async function event(channel: string, value: Record<string, unknown>) {
    return request("study-event", {
      capability: cap.current,
      channel,
      event: value,
    });
  }
  async function get(group: string, assessment = false) {
    const key = assessment ? "withdrawn-v1" : group;
    let s = active.current.get(key);
    if (!s) {
      s = session.parse(
        await event("session-start", {
          lessonId,
          setName: group,
          ...(assessment ? { assessment: "withdrawn-v1" } : {}),
        }),
      );
      active.current.set(key, s);
    }
    return s;
  }
  async function run(
    group: string,
    taskId: string,
    kind: "first" | "final" | "help",
    answer: Record<string, string> = {},
    checks: string[] = [],
    helpKind = "hint",
    assessment = false,
  ) {
    if (!enabled) return;
    if (pending.current || !cap.current)
      throw Error("课堂尚未准备好，请稍后重试。");
    pending.current = true;
    setError("");
    try {
      const s = await get(group, assessment);
      if (!s.taskIds.includes(taskId)) throw Error("这道题不在当前练习组中。");
      const send = async (channel: string, extra: Record<string, unknown>) => {
        const v = await commands.current.send(
            channel,
            {
              sessionId: s.id,
              revision: s.revision,
              taskId,
              ...extra,
            },
            event,
          ),
          out = z
            .object({
              revision: z.number().int(),
              status: z.string().optional(),
              message: z.string().optional(),
              text: z.string().optional(),
              firstAnswer: z.record(z.string(), z.string()).optional(),
            })
            .parse(v);
        s.revision = out.revision;
        if (out.status === "invalidInput" && channel === "self-check")
          throw Error(out.message ?? "请检查答案格式。");
        return out;
      };
      if (kind === "first") {
        const out = await send("self-check", { phase: "first", answer });
        return out.firstAnswer;
      } else if (kind === "help") {
        const out = await send("help", { kind: helpKind });
        setHelp((old) => ({
          ...old,
          [taskId]: [
            ...(old[taskId] ?? []),
            { kind: helpKind, text: out.text ?? "" },
          ],
        }));
      } else {
        await send("self-check", {
          phase: "evidence",
          evidence: {
            checks,
            reflection: "本次逐项勾选三项自查；不冒充口述证明。",
            finalConfirmed: true,
            format: "checklist-v1",
          },
        });
        await send("submit", { answer });
      }
    } catch (e) {
      if ((e as { status?: number }).status === 409) {
        try {
          const data = z
            .object({ sessions: z.array(session) })
            .parse(await request("study-data", { capability: cap.current }));
          for (const [key, saved] of active.current) {
            const latest = data.sessions.find((s) => s.id === saved.id);
            if (latest) active.current.set(key, latest);
          }
        } catch {}
      }
      setError(e instanceof Error ? e.message : "提交失败。");
      throw e;
    } finally {
      pending.current = false;
    }
  }
  return { ready, error, help, run };
}
