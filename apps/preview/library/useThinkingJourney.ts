import { PageCommands } from "../commands.ts";
import { eventId } from "../event-id.ts";
import { useEffect, useRef, useState } from "react";
import { z } from "../validation.ts";
import {
  thinkingToolSpec,
  validateThinkingTool,
  type ThinkingToolState,
} from "./source/thinking-tools.mjs";
const tool = z.object({
    version: z.string(),
    values: z.array(z.number()),
    view: z.number(),
  }),
  record = z.object({
    revision: z.number().int(),
    phase: z.string(),
    firstAnswer: z.string().nullable(),
    help: z.array(
      z.object({ kind: z.string(), level: z.number(), text: z.string() }),
    ),
    tool: tool.optional(),
    toolHistory: z.array(z.object({ before: tool, after: tool })).optional(),
    reflection: z.string().optional(),
    finalAnswer: z.string().optional(),
  });
export function useThinkingJourney(taskId: string) {
  const [work, setWork] = useState<z.infer<typeof record> | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const commands = useRef(new PageCommands());
  const capability = useRef(""),
    current = useRef<z.infer<typeof record> | null>(null),
    pending = useRef(false);
  async function request(path: string, body: unknown) {
    const r = await fetch("/preview-api/v1/training/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "omit",
        cache: "no-store",
      }),
      v: unknown = await r.json();
    if (!r.ok)
      throw Object.assign(
        Error(
          z.object({ message: z.string().optional() }).parse(v).message ??
            "这次操作尚未封存，输入保留，请重试。",
        ),
        { status: r.status },
      );
    return v;
  }
  useEffect(() => {
    let alive = true,
      token = "";
    void request("start", {})
      .then(async (v) => {
        token = z.object({ capability: z.string() }).parse(v).capability;
        if (!alive) {
          await request("release", { capability: token });
          return;
        }
        capability.current = token;
        const spec = thinkingToolSpec(taskId);
        if (spec) {
          const result = await request("study-event", {
              capability: token,
              channel: "thinking",
              event: {
                taskId,
                eventId: eventId(),
                revision: 0,
                action: "tool-open",
              },
            }),
            w = z.object({ record }).parse(result).record;
          if (alive) {
            current.current = w;
            setWork(w);
          }
        }
        if (alive) setBusy(false);
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          setBusy(false);
        }
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
      capability.current = "";
    };
  }, [taskId]);
  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (pending.current || !capability.current)
      throw Error("课堂还未准备好，请稍后重试。");
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const v = await commands.current.send(
          "thinking",
          {
            taskId,
            revision: current.current?.revision ?? 0,
            action,
            ...extra,
          },
          (channel, event) =>
            request("study-event", {
              capability: capability.current,
              channel,
              event,
            }),
        ),
        w = z.object({ record }).parse(v).record;
      const spec = thinkingToolSpec(taskId);
      if (w.tool && spec) validateThinkingTool(spec, w.tool);
      current.current = w;
      setWork(w);
      return w;
    } catch (e) {
      if ((e as { status?: number }).status === 409) {
        try {
          const data = z
              .object({ thinking: z.record(z.string(), record) })
              .parse(
                await request("study-data", { capability: capability.current }),
              ),
            latest = data.thinking[taskId];
          if (latest) {
            current.current = latest;
            setWork(latest);
          }
        } catch {}
      }
      setError(e instanceof Error ? e.message : "提交失败。");
      throw e;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return {
    work,
    busy,
    error,
    act,
    tool: work?.tool as ThinkingToolState | undefined,
    history: work?.toolHistory?.map((h) => h.before) as
      ThinkingToolState[] | undefined,
    first: async (a: Record<string, string>) => {
      if (current.current?.firstAnswer)
        return { value: current.current.firstAnswer };
      const w = await act("first", {
        answer: a.value ?? Object.values(a).join("；"),
      });
      return { value: w.firstAnswer ?? a.value ?? Object.values(a).join("；") };
    },
    final: async (a: Record<string, string>, checks: boolean[]) => {
      if (
        current.current?.phase === "pendingReview" &&
        current.current.finalAnswer !== (a.value ?? Object.values(a).join("；"))
      )
        throw Error("终答已封存，不能覆盖原记录。");
      if (current.current?.phase === "first")
        await act("check", {
          checks,
          reflection:
            "本次已逐项勾选检查条件、计算或理由与答案；尚无额外口述核对证据。",
        });
      if (current.current?.phase === "self-checked")
        await act("final", { answer: a.value ?? Object.values(a).join("；") });
    },
  };
}
