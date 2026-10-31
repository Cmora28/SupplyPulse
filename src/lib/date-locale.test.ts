import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatUtcDate } from "./date-locale";

describe("formatUtcDate", () => {
  it("keeps the UTC calendar date", () => {
    const date = new Date("2026-10-26T00:30:00.000Z");
    assert.equal(formatUtcDate(date, "yyyy-MM-dd", "en"), "2026-10-26");
  });

  it("uses the date-fns locale for month names", () => {
    const date = new Date("2026-10-26T00:00:00.000Z");
    assert.match(formatUtcDate(date, "PPP", "pt"), /outubro/i);
    assert.match(formatUtcDate(date, "PPP", "es"), /octubre/i);
    assert.match(formatUtcDate(date, "PPP", "fr"), /octobre/i);
    assert.match(formatUtcDate(date, "PPP", "de"), /Oktober/);
  });
});
