// getRandomValues is available on LAN HTTP. randomUUID/subtle require a secure
// context in browsers, so neither is a dependency of this anonymous experience.
export function eventId() {
  return (
    "event-" +
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("")
  );
}
