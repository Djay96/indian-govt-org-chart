// Shared accountability-resolution logic.
// Pure functions: no fs, no fetch, no DOM. The dataset is always passed in,
// so the same code runs in the browser (assets/app.js) and the Netlify
// function (netlify/functions/resolve.js), and stays unit-testable.

const FALLBACK_CHAIN_ID = "district-administration";

export function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Count how many of `keywords` appear in the normalized `text`.
function countMatches(text, keywords = []) {
  return keywords.reduce(
    (total, keyword) => total + (text.includes(normalize(keyword)) ? 1 : 0),
    0
  );
}

export function detectIssue(data, description) {
  const issues = data.issueTypes ?? [];
  const text = normalize(description);
  let winner = issues[0] ?? null;
  let topScore = 0;

  for (const issue of issues) {
    const score = countMatches(text, issue.keywords);
    if (score > topScore) {
      winner = issue;
      topScore = score;
    }
  }

  if (!winner) return null;
  return { ...winner, score: topScore };
}

export function detectJurisdiction(data, location) {
  const jurisdictions = data.jurisdictions ?? [];
  const text = normalize(location);
  // Default to the last jurisdiction, which is the statewide fallback.
  let best = jurisdictions[jurisdictions.length - 1] ?? null;
  let topScore = 0;

  for (const jurisdiction of jurisdictions) {
    const score = countMatches(text, jurisdiction.matches);
    if (score > topScore) {
      best = jurisdiction;
      topScore = score;
    }
  }

  if (!best) return null;
  return { ...best, score: topScore };
}

// Pick the chain id for an issue/jurisdiction pair, with road and the
// district-administration fallback as safety nets.
function pickChainId(jurisdiction, issue) {
  const chains = jurisdiction.defaultChains ?? {};
  return chains[issue.id] || chains.road || FALLBACK_CHAIN_ID;
}

function scoreConfidence(base, issueScore, jurisdictionScore) {
  const adjusted =
    base +
    (issueScore ? 0.08 : -0.08) +
    (jurisdictionScore ? 0.08 : -0.1);
  return Math.min(0.95, Math.max(0.25, adjusted));
}

export function resolveAccountability(data, description, location) {
  const issue = detectIssue(data, description);
  const jurisdiction = detectJurisdiction(data, location);
  if (!issue || !jurisdiction) {
    throw new Error("Dataset has no issue types or jurisdictions.");
  }

  let chainId = pickChainId(jurisdiction, issue);
  let chain = data.chains?.[chainId];
  if (!chain) {
    // Configured chain is missing; fall back so we never read from undefined.
    chainId = FALLBACK_CHAIN_ID;
    chain = data.chains?.[chainId];
  }
  if (!chain) {
    throw new Error(`No chain found for "${chainId}".`);
  }

  const officials = chain.officials
    .map((id) => {
      const official = data.officials?.[id];
      return official ? { id, ...official } : null;
    })
    .filter(Boolean);

  const confidence = scoreConfidence(
    chain.confidence,
    issue.score,
    jurisdiction.score
  );

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
