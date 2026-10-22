import { AppError } from "../contracts/index.ts";
export interface AuthConfig {
  origin: string;
  mode: "production" | "loopback-development";
  cookieName: string;
  secure: boolean;
}
export function authConfig(
  origin: string,
  mode: AuthConfig["mode"] = "production",
): AuthConfig {
  const u = new URL(origin);
  if (
    origin !== u.origin ||
    u.username ||
    u.password ||
    !["production", "loopback-development"].includes(mode)
  )
    throw new AppError("AUTH_ORIGIN_CONFIG", 503);
  const secure = mode === "production";
  if (
    secure
      ? u.protocol !== "https:"
      : !["development", "test"].includes(process.env.NODE_ENV ?? "") ||
        u.protocol !== "http:" ||
        !["127.0.0.1", "[::1]"].includes(u.hostname)
  )
    throw new AppError("AUTH_TRANSPORT_CONFIG", 503);
  return {
    origin: u.origin,
    mode,
    secure,
    cookieName: secure ? "__Host-klh-session" : "klh-dev-session",
  };
}
export function sessionCookie(
  config: AuthConfig,
  cookie: string,
  maxAge: number,
) {
  return `${config.cookieName}=${cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secure ? "; Secure" : ""}`;
}
