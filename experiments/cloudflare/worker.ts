import { D1Adapter } from "./adapter.mjs";
import { handle } from "../shared/api.mjs";
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/") && url.pathname !== "/health")
      return env.ASSETS.fetch(request);
    // Each HTTP request gets its own repository/session/metrics. Always start
    // at primary; no stale replica read is assumed correct for this prototype.
    const unavailable=String(env.BENCH_DB_FAULT)==="on"&&["local","ci"].includes(env.BENCH_ENV);
    const db = new D1Adapter(unavailable?{prepare(){throw Error("injected D1 unavailable");},batch(){throw Error("injected D1 unavailable");}}:env.DB.withSession("first-primary"));
    const response = await handle(request, db, env);
    const headers = new Headers(response.headers);
    headers.set("X-Bench-D1-Queries", String(db.stats.queries));
    if (db.stats.metaAvailable) {
      headers.set("X-Bench-D1-Rows-Read", String(db.stats.rowsRead));
      headers.set("X-Bench-D1-Rows-Written", String(db.stats.rowsWritten));
    }
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
