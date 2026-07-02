import type { Context, Config } from "@netlify/functions";
import fs from "node:fs";
import path from "node:path";
import {
  createChatHandler,
  loadAiContextFromCandidates,
} from "./_shared/chat-core.mjs";

let cachedAiContext: unknown | undefined;

function loadAiContext() {
  if (cachedAiContext !== undefined) return cachedAiContext;
  const candidates = [
    path.join(process.cwd(), "dist/data/ai-context.json"),
    path.join(process.cwd(), "public/data/ai-context.json"),
    path.join(process.cwd(), "data/ai-context.json"),
  ];
  cachedAiContext = loadAiContextFromCandidates(candidates, fs.readFileSync);
  return cachedAiContext;
}

const chatHandler = createChatHandler({
  getApiKey: () => Netlify.env.get("DEEPSEEK_API_KEY"),
  loadAiContext,
  fetchImpl: fetch,
  logger: console,
});

export default async (req: Request, _context: Context) => chatHandler(req);

export const config: Config = {
  path: "/api/chat",
  method: ["POST"],
};
