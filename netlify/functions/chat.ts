import type { Context, Config } from "@netlify/functions";
import fs from "node:fs";
import path from "node:path";

function loadAiContext() {
  const candidates = [
    path.join(process.cwd(), "dist/data/ai-context.json"),
    path.join(process.cwd(), "public/data/ai-context.json"),
    path.join(process.cwd(), "data/ai-context.json"),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      /* try next */
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You are an expert assistant for the Indian Government Org Chart — an open government data platform for India.

You help citizens, journalists, researchers, and civic technologists understand:
- Who holds which government office in India (Union, State, District, Local)
- How the org chart and chain of command works
- Official public contact channels (emails, helplines, grievance portals)
- Which office is responsible for which citizen problem (topics/responsibility map)
- Data coverage, verification status, and methodology

Rules:
- Answer based on the dataset context provided below and general knowledge of Indian governance.
- When citing specific officials or numbers, prefer the dataset context. If unsure, say so.
- Never invent personal contact details. Only reference official/public channels from the data.
- Be pedagogical — explain concepts like jurisdictions, positions vs persons, appointments.
- Keep answers concise but thorough. Use bullet points for lists.
- Link concepts: mention related entities (e.g., a DM reports to a Divisional Commissioner).`;

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey =
    Netlify.env.get("DEEPSEEK_API_KEY") ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "DEEPSEEK_API_KEY is not configured." },
      { status: 503 }
    );
  }

  try {
    const { messages = [] } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "messages array is required." },
        { status: 400 }
      );
    }

    const aiContext = loadAiContext();
    const contextBlock = aiContext
      ? `\n\n--- DATASET CONTEXT (Accountable India, generated ${aiContext.generatedAt}) ---\n${aiContext.summary}\n\nTop states: ${aiContext.topStatesByDistricts?.join("; ")}\n\nPosition types: ${JSON.stringify(aiContext.positionTypes)}\n\nSample senior positions:\n${aiContext.samplePositions?.join("\n")}\n\nCitizen topics:\n${aiContext.topics?.map((t: { name: string; keywords: string }) => `- ${t.name}: ${t.keywords}`).join("\n")}\n\nFull metrics: ${JSON.stringify(aiContext.metrics?.counts)}`
      : "";

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
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
      console.error("DeepSeek API error:", upstream.status, errText);
      return Response.json(
        { error: "AI service unavailable.", detail: errText.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const choice = data.choices?.[0];

    return Response.json({
      message: choice?.message ?? { role: "assistant", content: "No response." },
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return Response.json({ error: "Failed to process chat request." }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/chat",
  method: ["POST"],
};
