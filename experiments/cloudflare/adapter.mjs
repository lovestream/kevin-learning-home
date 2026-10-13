export class D1Adapter {
  constructor(binding) {
    this.binding = binding;
    this.stats = {
      queries: 0,
      rowsRead: 0,
      rowsWritten: 0,
      metaAvailable: true,
    };
  }
  record(result) {
    const meta = result?.meta ?? {};
    if (
      typeof meta.rows_read !== "number" ||
      typeof meta.rows_written !== "number"
    )
      this.stats.metaAvailable = false;
    else {
      this.stats.rowsRead += meta.rows_read;
      this.stats.rowsWritten += meta.rows_written;
    }
    return result;
  }
  async first(sql, args = []) {
    const result = await this.run(sql, args);
    return result.results[0] ?? null;
  }
  async all(sql, args = []) {
    return (await this.run(sql, args)).results;
  }
  async run(sql, args = []) {
    this.stats.queries++;
    return this.record(
      await this.binding
        .prepare(sql)
        .bind(...args)
        .all(),
    );
  }
  async batch(items) {
    this.stats.queries += items.length;
    const results = await this.binding.batch(
      items.map(([sql, args]) => this.binding.prepare(sql).bind(...args)),
    );
    return results.map((r) => this.record(r));
  }
}
