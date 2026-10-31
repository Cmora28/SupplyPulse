import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  JEV_ENDPOINT,
  JEV_MODEL,
  JEV_PROMPT_VERSION,
  buildJevRequestBody,
  classifyWithJev,
} from "./jev";
import sample from "./jev-sample-responses.json";

const state = {
  supplierName: "Mærsk",
  country: "Denmark",
  category: "container shipping",
  title: "Bosch’s popular e-bike",
  source: "Electrek",
  published: "Fri, 31 Oct 2026 12:00:00 GMT",
};

describe("JEV request", () => {
  it("matches the Python client's JSON encoding", () => {
    const expected = readFileSync(new URL("./jev-request.fixture.txt", import.meta.url), "utf8").trim();
    assert.equal(buildJevRequestBody(state), expected);
  });

  it("sends noul to systemone and reads answers.p.noul", async () => {
    let seenUrl = "";
    let seenAuth = "";
    let seenBody = "";
    const result = await classifyWithJev(state, {
      apiKey: "test-key",
      fetchImpl: async (url, init) => {
        seenUrl = String(url);
        const headers = init?.headers as Record<string, string>;
        seenAuth = headers.Authorization;
        seenBody = String(init?.body);
        return new Response(
          JSON.stringify({
            answers: { p: { noul: 0.04 } },
            usage: { input_tokens: 430, output_tokens: 20 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    });

    assert.equal(seenUrl, JEV_ENDPOINT);
    assert.equal(seenAuth, "Bearer test-key");
    const parsed = JSON.parse(seenBody) as {
      model: string;
      questions: { p: { type: string } };
    };
    assert.equal(parsed.model, JEV_MODEL);
    assert.equal(parsed.questions.p.type, "noul");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.p, 0.04);
      assert.equal(result.band, "ignored");
      assert.equal(result.promptVersion, JEV_PROMPT_VERSION);
      assert.equal(result.model, JEV_MODEL);
    }
  });

  it("replays the recorded sample scores without calling the network for a missing key", async () => {
    let calls = 0;
    const missing = await classifyWithJev(state, {
      apiKey: "",
      fetchImpl: async () => {
        calls += 1;
        throw new Error("network should not be used");
      },
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.reason, "missing_key");
    assert.equal(calls, 0);

    for (const row of sample) {
      const result = await classifyWithJev(
        { ...state, title: row.title },
        {
          apiKey: "test-key",
          fetchImpl: async () =>
            new Response(
              JSON.stringify({
                answers: { p: { noul: row.p } },
                usage: row.usage,
              }),
              { status: 200 }
            ),
        }
      );
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.p, row.p);
        assert.equal(result.band, "ignored");
      }
    }
  });

  it("stops cleanly on unauthorized and malformed payloads", async () => {
    const denied = await classifyWithJev(state, {
      apiKey: "bad",
      fetchImpl: async () => new Response("no", { status: 401 }),
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, "unauthorized");

    const malformed = await classifyWithJev(state, {
      apiKey: "test-key",
      fetchImpl: async () => new Response(JSON.stringify({ answers: {} }), { status: 200 }),
    });
    assert.equal(malformed.ok, false);
    if (!malformed.ok) assert.equal(malformed.reason, "bad_response");
  });
});
