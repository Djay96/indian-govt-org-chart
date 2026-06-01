import fs from "node:fs";

const REQUIRED_TOP_LEVEL = ["verifiedOn", "issueTypes", "jurisdictions", "officials", "chains"];
const FALLBACK_CHAIN_ID = "district-administration";

// Validate the accountability dataset. Throws on the first problem found,
// otherwise returns a small summary. Pure: takes data in, touches no files.
export function validateData(data) {
  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in data)) {
      throw new Error(`Missing top-level key: ${key}`);
    }
  }

  const issueIds = new Set();
  for (const issue of data.issueTypes) {
    if (!issue.id || !Array.isArray(issue.keywords) || issue.keywords.length === 0) {
      throw new Error(`Issue type ${issue.id ?? "(no id)"} needs an id and non-empty keywords`);
    }
    issueIds.add(issue.id);
  }

  for (const [id, official] of Object.entries(data.officials)) {
    for (const key of ["name", "title", "office", "contact"]) {
      if (!(key in official)) {
        throw new Error(`Official ${id} missing ${key}`);
      }
    }
  }

  for (const [id, chain] of Object.entries(data.chains)) {
    if (!Array.isArray(chain.officials) || chain.officials.length === 0) {
      throw new Error(`Chain ${id} has no officials`);
    }
    for (const officialId of chain.officials) {
      if (!data.officials[officialId]) {
        throw new Error(`Chain ${id} references unknown official ${officialId}`);
      }
    }
  }

  // Every chain a jurisdiction points to must exist, otherwise resolution
  // would fall through to the district-administration fallback unexpectedly.
  for (const jurisdiction of data.jurisdictions) {
    for (const [issueId, chainId] of Object.entries(jurisdiction.defaultChains ?? {})) {
      if (!data.chains[chainId]) {
        throw new Error(`Jurisdiction ${jurisdiction.id} maps ${issueId} to unknown chain ${chainId}`);
      }
    }
  }

  if (!data.chains[FALLBACK_CHAIN_ID]) {
    throw new Error(`Missing required fallback chain: ${FALLBACK_CHAIN_ID}`);
  }

  return {
    officials: Object.keys(data.officials).length,
    chains: Object.keys(data.chains).length,
    issueTypes: issueIds.size,
    jurisdictions: data.jurisdictions.length
  };
}

export function loadData(url = new URL("../data/accountability.json", import.meta.url)) {
  return JSON.parse(fs.readFileSync(url, "utf8"));
}

// Run as a script (npm run build) but stay importable for tests.
/* c8 ignore start -- CLI entrypoint, exercised by `npm run build` */
if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = validateData(loadData());
  console.log(
    `Validated ${summary.officials} officials, ${summary.chains} chains, ` +
      `${summary.issueTypes} issue types, ${summary.jurisdictions} jurisdictions.`
  );
}
/* c8 ignore stop */
