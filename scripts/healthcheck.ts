import { request } from "node:http";
const trusted = new URL(
  process.env.KLH_AUTH_ORIGIN ||
    process.env.KLH_INTERNAL_ORIGIN ||
    "http://127.0.0.1:4177",
);
await new Promise<void>((resolve, reject) => {
  const req = request(
    "http://127.0.0.1:" + (process.env.KLH_PORT ?? "4177") + "/health/ready",
    { headers: { Host: trusted.host } },
    (res) => {
      res.resume();
      res.on("end", () =>
        res.statusCode === 200 ? resolve() : reject(Error("NOT_READY")),
      );
    },
  );
  req.setTimeout(4000, () => req.destroy(Error("HEALTH_TIMEOUT")));
  req.on("error", reject);
  req.end();
});
