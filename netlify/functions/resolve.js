import fs from "node:fs";

const dataPath = new URL("../../data/accountability.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const normalize = (value = "") =>
  value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();

function detectIssue(description) {
  const text = normalize(description);
  let winner = data.issueTypes[0];
  let topScore = 0;

  for (const issue of data.issueTypes) {
    const score = issue.keywords.reduce((total, keyword) => {
      return total + (text.includes(normalize(keyword)) ? 1 : 0);
    }, 0);
    if (score > topScore) {
      winner = issue;
      topScore = score;
    }
  }

  return { ...winner, score: topScore };
}

function detectJurisdiction(location) {
  const text = normalize(location);
  let best = data.jurisdictions[data.jurisdictions.length - 1];
  let score = 0;

  for (const jurisdiction of data.jurisdictions) {
    const localScore = jurisdiction.matches.reduce((total, item) => {
      return total + (text.includes(normalize(item)) ? 1 : 0);
    }, 0);
    if (localScore > score) {
      best = jurisdiction;
      score = localScore;
    }
  }

  return { ...best, score };
}

function resolveAccountability(description, location) {
  const issue = detectIssue(description);
  const jurisdiction = detectJurisdiction(location);
  const chainId = jurisdiction.defaultChains[issue.id] || jurisdiction.defaultChains.road || "district-administration";
  const chain = data.chains[chainId];
  const officials = chain.officials.map((id) => ({ id, ...data.officials[id] }));
  const confidence = Math.min(0.95, Math.max(0.25, chain.confidence + (issue.score ? 0.08 : -0.08) + (jurisdiction.score ? 0.08 : -0.1)));

  return {
    issue,
    jurisdiction,
    chainId,
    chain,
    officials,
    confidence,
    description,
    location,
    verifiedOn: data.verifiedOn,
    notice: data.notice
  };
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { description = "", location = "" } = await req.json();
    if (!description.trim() || !location.trim()) {
      return Response.json({ error: "Description and location are required." }, { status: 400 });
    }

    return Response.json(resolveAccountability(description, location), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return Response.json({ error: "Could not resolve accountability." }, { status: 500 });
  }
};

export const config = {
  path: "/api/resolve",
  method: ["POST"]
};
