const trusted = new URL(
  process.env.KLH_INTERNAL_ORIGIN ?? "http://127.0.0.1:4177",
);
const response = await fetch(
  "http://127.0.0.1:" + (process.env.KLH_PORT ?? "4177") + "/health/ready",
  { headers: { Host: trusted.host }, signal: AbortSignal.timeout(4000) },
);
if (!response.ok) process.exit(1);
