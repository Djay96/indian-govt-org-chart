import fs from "node:fs";

const path = new URL("../data/accountability.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(path, "utf8"));

const requiredTopLevel = ["verifiedOn", "issueTypes", "jurisdictions", "officials", "chains"];
for (const key of requiredTopLevel) {
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

if (!data.chains["district-administration"]) {
  throw new Error("Missing required fallback chain: district-administration");
}

console.log(
  `Validated ${Object.keys(data.officials).length} officials, ` +
    `${Object.keys(data.chains).length} chains, ` +
    `${issueIds.size} issue types, ${data.jurisdictions.length} jurisdictions.`
);
