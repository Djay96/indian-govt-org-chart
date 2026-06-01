import fs from "node:fs";

const path = new URL("../data/accountability.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(path, "utf8"));

const requiredTopLevel = ["verifiedOn", "issueTypes", "jurisdictions", "officials", "chains"];
for (const key of requiredTopLevel) {
  if (!(key in data)) {
    throw new Error(`Missing top-level key: ${key}`);
  }
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

console.log(`Validated ${Object.keys(data.officials).length} officials and ${Object.keys(data.chains).length} chains.`);
