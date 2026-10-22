import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  request,
  sessionDTO,
  learnerDTO,
  RequestError,
  errorMessage,
  type Session,
  type Learner,
} from "./api.ts";

type Phase = "checking" | "anonymous" | "authenticated" | "unconfirmed";
export interface Identity {
  phase: Phase;
  session: Session | null;
  learners: Learner[];
  selected: string | null;
  busy: boolean;
  operation: string;
  notice: string;
}
const empty = (phase: Phase, notice = ""): Identity => ({
  phase,
  session: null,
  learners: [],
  selected: null,
  busy: false,
  operation: "",
  notice,
});
const REQUEST_MS = 8000,
  IDLE_MS = 30 * 60 * 1000,
  PARENT_POLL_MS = 5000;
type Action = "login" | "logout" | "parent-unlock" | "parent-lock" | "rotate";

/** Only server DTOs establish identity. No tokens, actor or selection are persisted. */
export function useIdentity() {
  const [state, setState] = useState<Identity>(() => empty("checking"));
  const live = useRef(state),
    generation = useRef(0),
    pending = useRef<AbortController | null>(null);
  // A fresh document never restores a cached parent elevation. Re-lock via the
  // real CSRF-protected API before revealing anything, without changing 02A.
  const intent = useRef<"logout" | "parent-lock" | null>("parent-lock"),
    focus = useRef<string | null>(null);
  const publish = (next: Identity) => {
    live.current = next;
    setState(next);
  };
  const mask = () => {
    document.documentElement.dataset.privacy = "hidden";
  };
  const active = (signal: AbortSignal) => {
    if (signal.aborted || pending.current?.signal !== signal)
      throw new RequestError("REQUEST_INTERRUPTED");
  };
  const suspend = (notice: string) => {
    mask();
    generation.current++;
    pending.current?.abort();
    pending.current = null;
    publish(empty("unconfirmed", notice));
  };
  async function run(
    operation: string,
    work: (signal: AbortSignal) => Promise<Identity>,
  ) {
    const oldFocus = document.activeElement?.id;
    if (oldFocus) focus.current = oldFocus;
    const ticket = ++generation.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    mask();
    publish({ ...empty("checking"), busy: true, operation });
    const timeout = setTimeout(() => controller.abort(), REQUEST_MS);
    try {
      const next = await work(controller.signal);
      if (ticket !== generation.current) return;
      active(controller.signal);
      // A response may arrive after an expiry while the request was pending.
      // Validate again before the commit; never briefly paint expired private data.
      if (next.session && next.session.expiresAt <= Date.now())
        throw new RequestError("SESSION_REQUIRED", 401);
      if (
        next.session?.actor.role === "parent" &&
        next.session.parentUnlocked &&
        (next.session.parentUnlockExpiresAt ?? 0) <= Date.now()
      ) {
        intent.current = "parent-lock";
        throw new RequestError("PARENT_UNLOCK_EXPIRED", 403);
      }
      if (ticket === generation.current) publish(next);
    } catch (e) {
      if (ticket !== generation.current) return;
      if (e instanceof RequestError && e.status === 401) {
        if (e.code === "AUTH_INVALID" && operation === "解锁") {
          publish(empty("unconfirmed", "密码不正确，请重新确认身份后再解锁。"));
          return;
        }
        if (intent.current) {
          intent.current = null;
          publish(empty("anonymous", "当前会话已失效，请重新登录。"));
        } else publish(empty("anonymous", errorMessage(e, operation)));
      } else if (e instanceof RequestError && e.code === "FEATURE_DISABLED")
        publish(empty("anonymous", errorMessage(e, operation)));
      else publish(empty("unconfirmed", errorMessage(e, operation)));
    } finally {
      clearTimeout(timeout);
      if (ticket === generation.current) pending.current = null;
    }
  }
  async function confirmed(
    value: unknown,
    signal: AbortSignal,
    selected: string | null,
  ): Promise<Identity> {
    active(signal);
    let session = sessionDTO(value);
    if (intent.current) {
      const action = intent.current;
      if (action === "logout") {
        await request("/api/v1/auth/logout", signal, {}, session.csrfToken);
        active(signal);
        intent.current = null;
        return empty("anonymous", "已退出当前会话。");
      }
      if (session.actor.role === "parent" && session.parentUnlocked)
        session = sessionDTO(
          await request(
            "/api/v1/auth/parent-lock",
            signal,
            {},
            session.csrfToken,
          ),
        );
      active(signal);
      intent.current = null;
    }
    if (
      session.actor.role === "parent" &&
      (!session.parentUnlocked ||
        !session.parentUnlockExpiresAt ||
        session.parentUnlockExpiresAt <= Date.now())
    ) {
      // Local expiry only hides. A fresh server check/lock is required to reveal again.
      if (session.parentUnlocked) {
        intent.current = "parent-lock";
        session = sessionDTO(
          await request(
            "/api/v1/auth/parent-lock",
            signal,
            {},
            session.csrfToken,
          ),
        );
        active(signal);
        intent.current = null;
      }
      return { ...empty("authenticated"), session };
    }
    const learners = learnerDTO(
      await request("/api/v1/learners", signal),
      session,
    );
    active(signal);
    if (selected && !learners.some((l) => l.id === selected))
      return {
        ...empty("authenticated", "授权范围已变化，请重新选择学习者。"),
        session,
        learners,
      };
    // SessionDTO IDs are restricted ASCII path segments; no slash, %, query or dot-prefix.
    if (selected)
      learnerDTO(
        await request("/api/v1/learners/" + selected, signal),
        session,
      );
    return {
      ...empty("authenticated"),
      session,
      learners,
      selected:
        selected ??
        (session.actor.role === "learner" ? (learners[0]?.id ?? null) : null),
    };
  }
  async function sync(selected = live.current.selected) {
    await run("确认权限", async (signal) => {
      try {
        return await confirmed(
          await request("/api/v1/auth/session", signal),
          signal,
          selected,
        );
      } catch (e) {
        if (e instanceof RequestError && e.status === 401) {
          active(signal);
          intent.current = null;
          return empty("anonymous");
        }
        throw e;
      }
    });
  }
  async function act(
    action: Action,
    credentials?: { login: string; password: string } | { password: string },
  ) {
    const previous = live.current;
    if (
      action !== "login" &&
      (previous.phase !== "authenticated" || !previous.session)
    )
      return;
    if (action === "logout" || action === "parent-lock")
      intent.current = action;
    if (action === "login") intent.current = null;
    const operation = {
      login: "登录",
      logout: "退出",
      "parent-unlock": "解锁",
      "parent-lock": "锁定",
      rotate: "更新会话",
    }[action];
    await run(operation, async (signal) => {
      const result = await request(
        "/api/v1/auth/" + action,
        signal,
        credentials ?? {},
        previous.session?.csrfToken,
      );
      active(signal);
      if (action === "logout") {
        intent.current = null;
        return empty("anonymous", "已退出当前会话。");
      }
      if (action === "parent-lock") intent.current = null;
      return confirmed(result, signal, null);
    });
  }
  const callbacks = useRef({ sync, suspend });
  callbacks.current = { sync, suspend };
  useLayoutEffect(() => {
    document.documentElement.dataset.privacy =
      state.phase === "authenticated" &&
      document.visibilityState !== "hidden" &&
      navigator.onLine
        ? "visible"
        : "hidden";
    if (
      state.phase === "authenticated" &&
      focus.current &&
      document.activeElement === document.body
    )
      document.getElementById(focus.current)?.focus();
    if (state.phase === "authenticated") focus.current = null;
  }, [state]);
  useEffect(() => {
    void callbacks.current.sync();
    const offline = () =>
      callbacks.current.suspend(
        "网络已断开，页面已隐藏。恢复连接后会重新确认权限。",
      );
    const online = () => void callbacks.current.sync();
    const visibility = () =>
      document.visibilityState === "hidden"
        ? callbacks.current.suspend("切回页面后将重新确认权限。")
        : online();
    const hide = () => callbacks.current.suspend("页面需要重新确认权限。");
    const show = (e: PageTransitionEvent) => {
      if (e.persisted) online();
    };
    const blur = () => {
      if (live.current.session?.parentUnlocked) hide();
    };
    let idle: ReturnType<typeof setTimeout>;
    const activity = () => {
      clearTimeout(idle);
      idle = setTimeout(
        () =>
          callbacks.current.suspend(
            "长时间未操作，页面已隐藏。请重新确认身份。",
          ),
        IDLE_MS,
      );
    };
    activity();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    window.addEventListener("focus", online);
    window.addEventListener("blur", blur);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", activity);
    document.addEventListener("keydown", activity);
    return () => {
      generation.current++;
      pending.current?.abort();
      clearTimeout(idle);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.removeEventListener("focus", online);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", activity);
      document.removeEventListener("keydown", activity);
    };
  }, []);
  useEffect(() => {
    const session = state.session;
    if (state.phase !== "authenticated" || !session) return;
    const absolute = setTimeout(
      () =>
        callbacks.current.suspend("会话需要重新确认，请重新登录或检查连接。"),
      Math.max(0, session.expiresAt - Date.now()),
    );
    let expiry: ReturnType<typeof setTimeout> | undefined,
      poll: ReturnType<typeof setInterval> | undefined;
    if (session.actor.role === "parent" && session.parentUnlocked) {
      expiry = setTimeout(
        () => {
          intent.current = "parent-lock";
          mask();
          void callbacks.current.sync();
        },
        Math.max(
          0,
          Math.min(
            5 * 60 * 1000,
            (session.parentUnlockExpiresAt ?? 0) - Date.now(),
          ),
        ),
      );
      poll = setInterval(() => void callbacks.current.sync(), PARENT_POLL_MS);
    }
    return () => {
      clearTimeout(absolute);
      clearTimeout(expiry);
      clearInterval(poll);
    };
  }, [state.phase, state.session]);
  return {
    state,
    sync,
    act,
    cancel: () => suspend("已停止等待，操作结果尚未确认。请重新确认身份。"),
  };
}
