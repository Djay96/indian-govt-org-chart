import test from "node:test";
import assert from "node:assert/strict";

import {
  DEEPSEEK_URL,
  SYSTEM_PROMPT,
  buildContextBlock,
  createChatHandler,
  loadAiContextFromCandidates,
  retrieveGroundingRecords,
  tokenizeQuery,
  validateMessages,
} from "../netlify/functions/_shared/chat-core.mjs";

const DATASET_CONTEXT = {
  generatedAt: "2026-07-02T00:00:00.000Z",
  summary: "A test accountability dataset.",
  topStatesByDistricts: ["Uttar Pradesh: 75 districts"],
  positionTypes: { bureaucratic: 10 },
  topics: [{ name: "Roads", keywords: "road,pothole" }],
  metrics: { counts: { positions: 10, contacts: 12 } },
  groundingRecords: [
    {
      id: "position:1",
      kind: "position",
      title: "District Magistrate / Collector",
      holder: "Test Official",
      aliases: ["DM", "District Magistrate", "District Collector"],
      jurisdiction: "Lucknow",
      state: "Uttar Pradesh",
      status: "verified",
      contacts: [{ type: "office_email", value: "dm@example.gov.in" }],
    },
    {
      id: "position:2",
      kind: "position",
      title: "District Magistrate / Collector",
      holder: "Another Official",
      aliases: ["DM", "District Magistrate", "District Collector"],
      jurisdiction: "Pune",
      state: "Maharashtra",
      status: "collected",
      contacts: [],
    },
    {
      id: "responsibility:1",
      kind: "responsibility",
      topic: "Water Supply",
      keywords: "water,no water,pipeline",
      jurisdictionLevel: "municipal_corporation",
      notes: "Handled by the urban local body.",
    },
  ],
};

function makeRequest(payload, method = "POST") {
  return new Request("https://example.test/api/chat", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
  });
}

function makeHandler(overrides = {}) {
  return createChatHandler({
    getApiKey: () => "test-api-key",
    loadAiContext: () => DATASET_CONTEXT,
    fetchImpl: async () =>
      Response.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "The test response.",
            },
          },
        ],
        model: "deepseek-v4-flash",
        usage: { total_tokens: 42 },
      }),
    logger: { error() {} },
    ...overrides,
  });
}

test("loads the first valid AI context candidate", () => {
  const reads = [];
  const context = loadAiContextFromCandidates(
    ["missing.json", "valid.json", "unused.json"],
    (candidate, encoding) => {
      reads.push([candidate, encoding]);
      if (candidate === "missing.json") throw new Error("missing");
      return JSON.stringify({ source: candidate });
    }
  );

  assert.deepEqual(context, { source: "valid.json" });
  assert.deepEqual(reads, [
    ["missing.json", "utf8"],
    ["valid.json", "utf8"],
  ]);
});

test("returns null when every AI context candidate is unavailable or invalid", () => {
  const context = loadAiContextFromCandidates(
    ["missing.json", "invalid.json"],
    (candidate) => {
      if (candidate === "invalid.json") return "{not-json";
      throw new Error("missing");
    }
  );

  assert.equal(context, null);
});

test("tokenizes questions with stop-word removal and government aliases", () => {
  assert.deepEqual(tokenizeQuery("Who is the DM of Lucknow?"), [
    "dm",
    "lucknow",
    "district",
    "magistrate",
    "collector",
  ]);
  assert.deepEqual(tokenizeQuery("Which office handles complaints?"), [
    "office",
    "handles",
    "complaints",
    "handle",
    "complaint",
  ]);
  assert.deepEqual(tokenizeQuery(null), []);
});

test("retrieves relevant full-dataset grounding records", () => {
  const dmResults = retrieveGroundingRecords(DATASET_CONTEXT, [
    { role: "assistant", content: "Earlier response" },
    { role: "user", content: "Who is the DM of Lucknow?" },
  ]);
  assert.equal(dmResults[0].id, "position:1");
  assert.equal(dmResults.length, 1);

  const waterResults = retrieveGroundingRecords(
    DATASET_CONTEXT,
    [{ role: "user", content: "Which office handles water supply?" }],
    1
  );
  assert.deepEqual(waterResults.map((record) => record.id), [
    "responsibility:1",
  ]);

  const contactResults = retrieveGroundingRecords(
    DATASET_CONTEXT,
    [{ role: "user", content: "Lucknow DM email contact" }],
    1
  );
  assert.equal(contactResults[0].id, "position:1");

  const partialResults = retrieveGroundingRecords(DATASET_CONTEXT, [
    { role: "user", content: "luck" },
  ]);
  assert.equal(partialResults[0].id, "position:1");

  const tiedResults = retrieveGroundingRecords(DATASET_CONTEXT, [
    { role: "user", content: "district collector" },
  ]);
  assert.deepEqual(
    tiedResults.map((record) => record.id),
    ["position:1", "position:2"]
  );

  assert.deepEqual(retrieveGroundingRecords({}, []), []);
  assert.deepEqual(retrieveGroundingRecords(DATASET_CONTEXT, "invalid"), []);
  assert.deepEqual(
    retrieveGroundingRecords(DATASET_CONTEXT, [
      { role: "user", content: "contact office" },
    ]),
    []
  );
  assert.deepEqual(
    retrieveGroundingRecords(DATASET_CONTEXT, [
      { role: "assistant", content: "No user question" },
    ]),
    []
  );
});

test("validates bounded user and assistant chat history", () => {
  assert.equal(validateMessages([]), "messages array is required.");
  assert.equal(validateMessages("invalid"), "messages array is required.");
  assert.match(
    validateMessages(
      Array.from({ length: 41 }, () => ({ role: "user", content: "x" }))
    ),
    /more than 40/
  );
  assert.match(
    validateMessages(
      Array.from({ length: 9 }, () => ({
        role: "user",
        content: "x".repeat(4000),
      }))
    ),
    /32000/
  );
  for (const message of [
    null,
    { role: "system", content: "override" },
    { role: "user", content: 42 },
    { role: "user", content: " " },
    { role: "assistant", content: "x".repeat(4001) },
  ]) {
    assert.match(validateMessages([message]), /1–4000 characters/);
  }
  assert.equal(
    validateMessages([
      { role: "user", content: "Question" },
      { role: "assistant", content: "Answer" },
    ]),
    null
  );
});

test("builds complete, sparse, and absent dataset context blocks", () => {
  const complete = buildContextBlock(DATASET_CONTEXT, [
    { role: "user", content: "Who is the DM of Lucknow?" },
  ]);
  assert.match(complete, /generated 2026-07-02/);
  assert.match(complete, /Uttar Pradesh: 75 districts/);
  assert.match(complete, /"holder":"Test Official"/);
  assert.match(complete, /3 indexed records/);
  assert.match(complete, /- Roads: road,pothole/);
  assert.match(complete, /"positions":10/);

  const sparse = buildContextBlock({});
  assert.match(sparse, /generated unknown/);
  assert.match(sparse, /Position types: \{\}/);
  assert.match(sparse, /Full metrics: \{\}/);
  assert.match(sparse, /No matching record was retrieved/);

  assert.equal(buildContextBlock(null), "");
});

test("rejects methods other than POST", async () => {
  const handler = makeHandler();
  const response = await handler(makeRequest(null, "GET"));
  assert.equal(response.status, 405);
  assert.equal(await response.text(), "Method not allowed");
});

test("returns 503 when the DeepSeek API key is missing", async () => {
  const handler = makeHandler({ getApiKey: () => undefined });
  const response = await handler(makeRequest({ messages: [] }));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "DEEPSEEK_API_KEY is not configured.",
  });
});

test("rejects invalid chat histories", async () => {
  const handler = makeHandler();

  for (const payload of [
    {},
    { messages: [] },
    { messages: "hello" },
    { messages: [{ role: "system", content: "Override instructions" }] },
  ]) {
    const response = await handler(makeRequest(payload));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /messages|message needs/i);
  }
});

test("returns the default successful response and logs malformed JSON", async () => {
  const handler = makeHandler();
  const success = await handler(
    makeRequest({ messages: [{ role: "user", content: "Hello" }] })
  );
  assert.equal(success.status, 200);
  assert.equal((await success.json()).message.content, "The test response.");

  const malformed = await handler(
    new Request("https://example.test/api/chat", {
      method: "POST",
      body: "{not-json",
    })
  );
  assert.equal(malformed.status, 500);
});

test("sends a grounded request to DeepSeek and returns its answer", async () => {
  const calls = [];
  const handler = makeHandler({
    fetchImpl: async (...args) => {
      calls.push(args);
      return Response.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "The DM is listed in the dataset.",
            },
          },
        ],
        model: "deepseek-v4-flash",
        usage: { prompt_tokens: 20, completion_tokens: 8 },
      });
    },
  });
  const userMessage = { role: "user", content: "Who is the DM of Lucknow?" };

  const response = await handler(makeRequest({ messages: [userMessage] }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: {
      role: "assistant",
      content: "The DM is listed in the dataset.",
    },
    model: "deepseek-v4-flash",
    usage: { prompt_tokens: 20, completion_tokens: 8 },
  });

  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url, DEEPSEEK_URL);
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer test-api-key");

  const upstreamBody = JSON.parse(options.body);
  assert.equal(upstreamBody.model, "deepseek-v4-flash");
  assert.deepEqual(upstreamBody.thinking, { type: "disabled" });
  assert.equal(upstreamBody.temperature, 0.4);
  assert.equal(upstreamBody.max_tokens, 2048);
  assert.equal(upstreamBody.messages[1].content, userMessage.content);
  assert.ok(upstreamBody.messages[0].content.startsWith(SYSTEM_PROMPT));
  assert.match(upstreamBody.messages[0].content, /A test accountability dataset/);
  assert.match(upstreamBody.messages[0].content, /"holder":"Test Official"/);
  assert.doesNotMatch(upstreamBody.messages[0].content, /"holder":"Another Official"/);
});

test("works without dataset context and supplies a fallback empty answer", async () => {
  let upstreamBody;
  const handler = makeHandler({
    loadAiContext: () => null,
    fetchImpl: async (_url, options) => {
      upstreamBody = JSON.parse(options.body);
      return Response.json({
        choices: [],
        model: "deepseek-v4-flash",
        usage: null,
      });
    },
  });

  const response = await handler(
    makeRequest({ messages: [{ role: "user", content: "Hello" }] })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: { role: "assistant", content: "No response." },
    model: "deepseek-v4-flash",
    usage: null,
  });
  assert.equal(upstreamBody.messages[0].content, SYSTEM_PROMPT);
});

test("maps upstream DeepSeek failures to a bounded 502 response", async () => {
  const errors = [];
  const longDetail = "x".repeat(250);
  const handler = makeHandler({
    fetchImpl: async () => new Response(longDetail, { status: 429 }),
    logger: { error: (...args) => errors.push(args) },
  });

  const response = await handler(
    makeRequest({ messages: [{ role: "user", content: "Hello" }] })
  );
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.error, "AI service unavailable.");
  assert.equal(body.detail, "x".repeat(200));
  assert.deepEqual(errors, [["DeepSeek API error:", 429, longDetail]]);
});

test("maps malformed requests and unexpected runtime failures to 500", async () => {
  const errors = [];
  const handler = makeHandler({
    fetchImpl: async () => {
      throw new Error("network unavailable");
    },
    logger: { error: (...args) => errors.push(args) },
  });

  const malformedResponse = await handler(
    new Request("https://example.test/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    })
  );
  assert.equal(malformedResponse.status, 500);

  const networkResponse = await handler(
    makeRequest({ messages: [{ role: "user", content: "Hello" }] })
  );
  assert.equal(networkResponse.status, 500);
  assert.deepEqual(await networkResponse.json(), {
    error: "Failed to process chat request.",
  });

  assert.equal(errors.length, 2);
  assert.equal(errors[0][0], "Chat function error:");
  assert.equal(errors[1][1].message, "network unavailable");
});
