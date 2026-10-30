import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Supplier } from "@prisma/client";
import { buildPrompt } from "./perplexity";
import {
  decideP1Alert,
  extractRiskAssessment,
  riskDelta,
} from "./risk-score";

const SUMMARY = `## 1. Executive Summary

- **Overall priority this week:** P2 for Acme, tied to 12% COGS exposure.

| Priority | Finding | Evidence | Impact | Action this week |
| --- | --- | --- | --- | --- |
| P2 | Ningbo congestion adds delay | Reuters, 3 Oct 2026 | +5 days | Expedite buffer |
| P3 | Tariff review underway | MOFCOM notice | cost +2% | Monitor |

## 2. Confirmed Risks (Past 7 Days)

No confirmed disruptive events identified for this supplier and lane this week.
`;

describe("buildPrompt", () => {
  it("asks for a real risk-score fence instead of escaped backticks", () => {
    const supplier = {
      id: "s",
      userId: "u",
      name: "Acme",
      country: "China",
      category: "Electronics",
      leadTimeDays: 10,
      cogsPercentage: 5,
      shippingRoute: null,
      dependencies: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Supplier;
    const prompt = buildPrompt(supplier, "en");
    assert.match(prompt, /```risk-score\n\{"priority":"P2"/);
    assert.equal(prompt.includes("\\`"), false);
  });
});

describe("extractRiskAssessment", () => {
  it("parses a risk-score fence and removes it from the stored markdown", () => {
    const raw = `${SUMMARY}
\`\`\`risk-score
{"priority":"P2","riskScore":55,"riskFactors":["Ningbo congestion","Tariff review"]}
\`\`\`
`;
    const { content, assessment } = extractRiskAssessment(raw);
    assert.equal(assessment?.priority, "P2");
    assert.equal(assessment?.riskScore, 55);
    assert.deepEqual(assessment?.riskFactors, [
      "Ningbo congestion",
      "Tariff review",
    ]);
    assert.equal(content.includes("risk-score"), false);
    assert.equal(content.includes("Ningbo congestion adds delay"), true);
  });

  it("clamps a score that disagrees with the stated priority band", () => {
    const raw = `${SUMMARY}
\`\`\`risk-score
{"priority":"P2","riskScore":99,"riskFactors":["Ningbo congestion"]}
\`\`\`
`;
    const { assessment } = extractRiskAssessment(raw);
    assert.equal(assessment?.priority, "P2");
    assert.equal(assessment?.riskScore, 66);
  });

  it("trusts an explicit overall priority over a conflicting JSON block", () => {
    const raw = `## 1. Executive Summary

- **Overall priority this week:** P1 for Acme after a confirmed port closure.

\`\`\`risk-score
{"priority":"P3","riskScore":10,"riskFactors":["Port closure"]}
\`\`\`
`;
    const { assessment } = extractRiskAssessment(raw);
    assert.equal(assessment?.priority, "P1");
    assert.equal(assessment?.riskScore, 67);
    assert.deepEqual(assessment?.riskFactors, ["Port closure"]);
  });

  it("falls back to the executive summary when the fence is not valid JSON", () => {
    const raw = `${SUMMARY}
\`\`\`risk-score
not json
\`\`\`
`;
    const { content, assessment } = extractRiskAssessment(raw);
    assert.equal(assessment?.priority, "P2");
    assert.equal(assessment?.riskScore, 50);
    assert.deepEqual(assessment?.riskFactors, [
      "Ningbo congestion adds delay",
      "Tariff review underway",
    ]);
    assert.equal(content.includes("not json"), false);
  });

  it("scores translated priority lines and leaves unscored prose untouched", () => {
    const french = `## 1. Synthèse

- **Priorité globale cette semaine :** P1 pour Acme, exposition COGS élevée.

- Grève confirmée au port
`;
    const scored = extractRiskAssessment(french);
    assert.equal(scored.assessment?.priority, "P1");
    assert.equal(scored.assessment?.riskScore, 85);
    assert.deepEqual(scored.assessment?.riskFactors, [
      "Grève confirmée au port",
    ]);
    assert.equal(scored.content, french);

    const plain = extractRiskAssessment("No priority discussed this week.\n");
    assert.equal(plain.assessment, null);
    assert.equal(plain.content, "No priority discussed this week.\n");
  });

  it("accepts a trailing JSON object and string scores", () => {
    const raw = `${SUMMARY}
{"priority":"P2","riskScore":"41","riskFactors":["  Lane delay  ","","extra","fourth"]}
`;
    const { content, assessment } = extractRiskAssessment(raw);
    assert.equal(assessment?.priority, "P2");
    assert.equal(assessment?.riskScore, 41);
    assert.deepEqual(assessment?.riskFactors, ["Lane delay", "extra", "fourth"]);
    assert.equal(content.includes("riskScore"), false);
  });
});

describe("decideP1Alert", () => {
  it("sends only for a new P1 when alerts are enabled", () => {
    assert.equal(
      decideP1Alert({ priority: "P1", alertAlreadySent: false, alertsEnabled: true }),
      "send"
    );
    assert.equal(
      decideP1Alert({ priority: "P1", alertAlreadySent: true, alertsEnabled: true }),
      "skip_duplicate"
    );
    assert.equal(
      decideP1Alert({ priority: "P1", alertAlreadySent: false, alertsEnabled: false }),
      "skip_disabled"
    );
    assert.equal(
      decideP1Alert({ priority: "P2", alertAlreadySent: false, alertsEnabled: true }),
      "skip_not_p1"
    );
    assert.equal(
      decideP1Alert({ priority: "P2", alertAlreadySent: true, alertsEnabled: true }),
      "clear_sent"
    );
    assert.equal(
      decideP1Alert({ priority: null, alertAlreadySent: false, alertsEnabled: true }),
      "skip_not_p1"
    );
  });
});

describe("riskDelta", () => {
  it("returns null when either week has no score", () => {
    assert.equal(riskDelta(80, null), null);
    assert.equal(riskDelta(null, 40), null);
    assert.equal(riskDelta(82, 70), 12);
    assert.equal(riskDelta(40, 55), -15);
  });
});
