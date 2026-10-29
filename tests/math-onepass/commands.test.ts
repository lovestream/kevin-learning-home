import test from "node:test";
import assert from "node:assert/strict";
import { PageCommands } from "../../apps/preview/commands.ts";
test("lost response retries retain the same event ID/revision; a new acknowledged operation gets a new ID", async () => {
  const q = new PageCommands(),
    calls: Record<string, unknown>[] = [],
    receipts = new Map<string, { revision: number }>();
  let first = true;
  const transport = async (
    _channel: string,
    event: Record<string, unknown>,
  ) => {
    calls.push(event);
    const id = String(event.eventId);
    if (!receipts.has(id)) receipts.set(id, { revision: receipts.size + 1 });
    if (first) {
      first = false;
      throw Error("RESPONSE_LOST_AFTER_REAL_COMMIT");
    }
    return receipts.get(id);
  };
  const fields = {
    action: "first",
    attemptId: "synthetic-command",
    expectedRevision: 1,
    value: "9",
  };
  await assert.rejects(q.send("self", fields, transport));
  assert.deepEqual(
    await q.send("self", { ...fields, expectedRevision: 99 }, transport),
    { revision: 1 },
  );
  assert.equal(calls[0].eventId, calls[1].eventId);
  assert.equal(calls[1].expectedRevision, 1);
  assert.equal(receipts.size, 1);
  await q.send(
    "self",
    { ...fields, action: "final", expectedRevision: 2 },
    transport,
  );
  assert.notEqual(calls[2].eventId, calls[1].eventId);
});
test("an explicit conflict is not replayed forever; the next command can use the reconciled revision", async () => {
  const q = new PageCommands(),
    calls: Record<string, unknown>[] = [];
  await assert.rejects(
    q.send("self", { action: "first", revision: 1 }, async (_, event) => {
      calls.push(event);
      throw Object.assign(Error("STALE"), { status: 409 });
    }),
  );
  await q.send("self", { action: "first", revision: 2 }, async (_, event) => {
    calls.push(event);
    return {};
  });
  assert.equal(calls[1].revision, 2);
  assert.notEqual(calls[0].eventId, calls[1].eventId);
});
