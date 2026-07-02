export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export const SYSTEM_PROMPT = `You are an expert assistant for the Indian Government Org Chart — an open government data platform for India.

You help citizens, journalists, researchers, and civic technologists understand:
- Who holds which government office in India (Union, State, District, Local)
- How the org chart and chain of command works
- Official public contact channels (emails, helplines, grievance portals)
- Which office is responsible for which citizen problem (topics/responsibility map)
- Data coverage, verification status, and methodology

Rules:
- Treat the retrieved dataset records as the primary evidence for current officials, contacts, coverage, and responsibility.
- Do not use general knowledge to guess a current office-holder or contact. If the retrieved records do not contain the answer, say the dataset does not establish it.
- Mention pending/stale status or low confidence when it materially affects an answer.
- Never invent personal contact details. Only reference official/public channels from the data.
- Be pedagogical — explain concepts like jurisdictions, positions vs persons, appointments.
- Keep answers concise but thorough. Use bullet points for lists.
- Link concepts: mention related entities (e.g., a DM reports to a Divisional Commissioner).`;

const STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "at",
  "be",
  "by",
  "do",
  "does",
  "for",
  "from",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "please",
  "the",
  "to",
  "we",
  "what",
  "which",
  "who",
  "with",
]);

const TOKEN_ALIASES = {
  dm: ["district", "magistrate", "collector"],
  sp: ["superintendent", "police"],
  cm: ["chief", "minister"],
  pm: ["prime", "minister"],
  cs: ["chief", "secretary"],
};

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenizeQuery(value) {
  const baseTokens = normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  const tokens = new Set(baseTokens);
  for (const token of baseTokens) {
    for (const alias of TOKEN_ALIASES[token] ?? []) tokens.add(alias);
    if (token.length > 4 && token.endsWith("s")) {
      tokens.add(token.slice(0, -1));
    }
  }
  return [...tokens];
}

export function retrieveGroundingRecords(aiContext, messages, limit = 40) {
  const records = Array.isArray(aiContext?.groundingRecords)
    ? aiContext.groundingRecords
    : [];
  const latestUserMessage = [...(Array.isArray(messages) ? messages : [])]
    .reverse()
    .find(
      (message) =>
        message?.role === "user" && typeof message.content === "string"
    );
  const tokens = tokenizeQuery(latestUserMessage?.content);
  if (records.length === 0 || tokens.length === 0) return [];
  const routingIntent = tokens.some((token) =>
    ["complaint", "handle", "responsibility", "responsible"].includes(token)
  );
  const contactIntent = tokens.some((token) =>
    ["contact", "email", "phone", "telephone"].includes(token)
  );
  const contentTokens = tokens.filter(
    (token) =>
      ![
        "complaint",
        "handle",
        "responsibility",
        "responsible",
        "office",
        "contact",
        "email",
        "phone",
        "telephone",
      ].includes(token)
  );
  if (contentTokens.length === 0) return [];

  const ranked = records
    .map((record) => {
      const { reportsTo: _reportsTo, sourceUrl: _sourceUrl, ...searchable } =
        record;
      const text = normalizeText(JSON.stringify(searchable));
      const words = new Set(text.split(/\s+/));
      let score = contentTokens.reduce((total, token) => {
        if (words.has(token)) return total + 4;
        if (token.length >= 4 && text.includes(token)) return total + 2;
        return total;
      }, 0);
      if (score > 0 && routingIntent && record.kind === "responsibility") {
        score += 8;
      }
      if (
        score > 0 &&
        contactIntent &&
        Array.isArray(record.contacts) &&
        record.contacts.length > 0
      ) {
        score += 6;
      }
      return { record, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.record.id).localeCompare(String(b.record.id))
    );
  const bestScore = ranked[0]?.score ?? 0;
  const cutoff = contentTokens.length > 1 ? Math.max(1, bestScore - 3) : 1;

  return ranked
    .filter(({ score }) => score >= cutoff)
    .slice(0, limit)
    .map(({ record }) => record);
}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "messages array is required.";
  }
  if (messages.length > 40) {
    return "messages array cannot contain more than 40 messages.";
  }
  if (
    messages.reduce(
      (total, message) =>
        total +
        (typeof message?.content === "string" ? message.content.length : 0),
      0
    ) > 32000
  ) {
    return "Combined message content cannot exceed 32000 characters.";
  }
  const valid = messages.every(
    (message) =>
      message &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.trim().length > 0 &&
      message.content.length <= 4000
  );
  return valid
    ? null
    : "Each message needs a user/assistant role and 1–4000 characters of content.";
}

export function loadAiContextFromCandidates(candidates, readFileSync) {
  for (const candidate of candidates) {
    try {
      return JSON.parse(readFileSync(candidate, "utf8"));
    } catch {
      // Try the next build/local path.
    }
  }
  return null;
}

export function buildContextBlock(aiContext, messages = []) {
  if (!aiContext) return "";

  const topStates = Array.isArray(aiContext.topStatesByDistricts)
    ? aiContext.topStatesByDistricts
    : [];
  const topics = Array.isArray(aiContext.topics) ? aiContext.topics : [];
  const groundingRecords = Array.isArray(aiContext.groundingRecords)
    ? aiContext.groundingRecords
    : [];
  const retrieved = retrieveGroundingRecords(aiContext, messages);
  const retrievedText =
    retrieved.length > 0
      ? retrieved.map((record) => JSON.stringify(record)).join("\n")
      : "No matching record was retrieved. State that the dataset does not establish the requested fact.";

  return `\n\n--- DATASET CONTEXT (Accountable India, generated ${aiContext.generatedAt ?? "unknown"}) ---
${aiContext.summary ?? ""}

Top states: ${topStates.join("; ")}

Position types: ${JSON.stringify(aiContext.positionTypes ?? {})}

Citizen topics:
${topics.map((topic) => `- ${topic.name}: ${topic.keywords}`).join("\n")}

Full metrics: ${JSON.stringify(aiContext.metrics?.counts ?? {})}

Retrieved records for this question (${retrieved.length} of ${groundingRecords.length} indexed records):
${retrievedText}`;
}

export function createChatHandler({
  getApiKey,
  loadAiContext,
  fetchImpl,
  logger,
}) {
  return async function chatHandler(req) {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "DEEPSEEK_API_KEY is not configured." },
        { status: 503 }
      );
    }

    try {
      const payload = await req.json();
      const messages = payload.messages ?? [];
      const validationError = validateMessages(messages);
      if (validationError) {
        return Response.json(
          { error: validationError },
          { status: 400 }
        );
      }

      const contextBlock = buildContextBlock(loadAiContext(), messages);
      const upstream = await fetchImpl(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + contextBlock },
            ...messages,
          ],
          thinking: { type: "disabled" },
          temperature: 0.4,
          max_tokens: 2048,
        }),
      });

      if (!upstream.ok) {
        const errText = await upstream.text();
        logger.error("DeepSeek API error:", upstream.status, errText);
        return Response.json(
          { error: "AI service unavailable.", detail: errText.slice(0, 200) },
          { status: 502 }
        );
      }

      const data = await upstream.json();
      const choice = data.choices?.[0];

      return Response.json({
        message: choice?.message ?? {
          role: "assistant",
          content: "No response.",
        },
        model: data.model,
        usage: data.usage,
      });
    } catch (error) {
      logger.error("Chat function error:", error);
      return Response.json(
        { error: "Failed to process chat request." },
        { status: 500 }
      );
    }
  };
}
