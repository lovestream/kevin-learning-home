/** Explicit SPA entry points, shared by the browser and static server. No data URLs. */
export const shellRoutes = [
  "/",
  "/login",
  "/home",
  "/today",
  "/subjects",
  "/review",
  "/growth",
  "/parent",
  "/parent/report",
] as const;
export function isShellRoute(path: string) {
  return (
    (shellRoutes as readonly string[]).includes(path) ||
    /^\/subjects\/[a-z][a-z0-9-]{0,47}$/.test(path)
  );
}
export function isPublicRoute(path: string) {
  return (
    path === "/" ||
    path === "/login" ||
    /^\/subjects\/[a-z][a-z0-9-]{0,47}$/.test(path)
  );
}
