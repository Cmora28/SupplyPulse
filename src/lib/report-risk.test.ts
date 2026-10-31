import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractSupplierRisk } from "./report-risk";

describe("extractSupplierRisk", () => {
  it("prefers the highest-priority finding in the summary table", () => {
    const content = `
| Priority | Finding | Evidence |
| P2 | Strike announced in the metals sector | Reuters |
| P1 | Port congestion in Yantian[9] | Maersk |
| P3 | Stable inland rail | — |
`;
    const risk = extractSupplierRisk(content);
    assert.equal(risk.level, "high");
    assert.equal(risk.summary, "Port congestion in Yantian");
  });

  it("returns low and no summary when nothing structured is present", () => {
    assert.deepEqual(extractSupplierRisk(null), { level: "low", summary: null });
    assert.deepEqual(extractSupplierRisk("No table in this note."), {
      level: "low",
      summary: null,
    });
  });

  it("reads a P2 row when that is the top priority", () => {
    const content = "| P2 | Authorized strike vote at a DRAM plant | x |";
    const risk = extractSupplierRisk(content);
    assert.equal(risk.level, "medium");
    assert.equal(risk.summary, "Authorized strike vote at a DRAM plant");
  });
});
