// Operational preflight only. Never resets counters, changes limits or skips login.
export function budgetFor(row, nowMs, needed) {
  const active=!!row && row.expiresAtMs>nowMs;
  const used=active?row.attempts:0;
  return {needed,remaining:Math.max(0,5-used),
    enough:used+needed<=5,
    waitSeconds:used+needed<=5?0:Math.max(0,Math.ceil((row.expiresAtMs-nowMs)/1000))};
}
