import { eventId } from "./event-id.ts";
// Keep an uncertain command's event ID and revision until its outcome is known.
// Memory only; no token, draft or answer is written to browser storage.
export class PageCommands {
  private uncertain = new Map<string, Record<string, unknown>>();
  async send(
    channel: string,
    fields: Record<string, unknown>,
    transport: (
      channel: string,
      event: Record<string, unknown>,
    ) => Promise<unknown>,
  ) {
    const semantic = Object.fromEntries(
      Object.entries(fields).filter(
        ([k]) => !["eventId", "revision", "expectedRevision"].includes(k),
      ),
    );
    const key = JSON.stringify([channel, semantic], (_, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(
            Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
          )
        : v,
    );
    let event = this.uncertain.get(key);
    if (!event) {
      if (this.uncertain.size >= 64)
        throw Error("有未确认的操作，请先重试原操作；已有输入未删除。");
      event = { ...fields, eventId: eventId() };
      this.uncertain.set(key, event);
    }
    try {
      const result = await transport(channel, event);
      this.uncertain.delete(key);
      return result;
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status && status >= 400 && status < 500 && status !== 408)
        this.uncertain.delete(key);
      throw e;
    }
  }
}
