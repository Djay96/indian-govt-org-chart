import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  normalize,
  detectIssue,
  detectJurisdiction,
  resolveAccountability
} from "../assets/resolve-core.js";

// A small, fully-controlled dataset so every branch is exercised on purpose.
const fixture = () => ({
  verifiedOn: "2026-01-01",
  notice: "test notice",
  issueTypes: [
    { id: "road", label: "Road", keywords: ["pothole", "road"] },
    { id: "water", label: "Water", keywords: ["water"] }
  ],
  jurisdictions: [
    {
      id: "city",
      label: "City",
      matches: ["lucknow"],
      // water -> a chain that does not exist, to exercise the fallback.
      defaultChains: { road: "city-road", water: "ghost-chain" }
    },
    {
      id: "statewide",
      label: "Statewide",
      matches: ["up"],
      // no entries -> pickChainId falls through to district-administration.
      defaultChains: {}
    }
  ],
  officials: {
    o1: { name: "A", title: "T1", office: "O1", contact: {} },
    o2: { name: "B", title: "T2", office: "O2", contact: {} }
  },
  chains: {
    "city-road": {
      label: "City Road",
      department: "Dept",
      ownershipTest: "x",
      confidence: 0.7,
      officials: ["o1", "o2", "ghost-official"] // ghost dropped on resolve
    },
    "district-administration": {
      label: "Fallback",
      department: "District",
      ownershipTest: "y",
      confidence: 0.5,
      officials: ["o1"]
    }
  }
});

test("normalize lowercases, strips punctuation, collapses whitespace", () => {
  assert.equal(normalize("Pothole,   ROAD!!"), "pothole road");
  assert.equal(normalize("  Gomti-Nagar  "), "gomti-nagar");
});

test("normalize defaults missing input and coerces non-strings", () => {
  assert.equal(normalize(), "");
  assert.equal(normalize(12345), "12345");
});

test("detectIssue picks the highest-scoring issue", () => {
  const issue = detectIssue(fixture(), "deep pothole in the road");
  assert.equal(issue.id, "road");
  assert.equal(issue.score, 2);
});

test("detectIssue falls back to the first issue with score 0 when nothing matches", () => {
  const issue = detectIssue(fixture(), "completely unrelated text");
  assert.equal(issue.id, "road");
  assert.equal(issue.score, 0);
});

test("detectIssue matches a secondary issue", () => {
  const issue = detectIssue(fixture(), "no clean water here");
  assert.equal(issue.id, "water");
  assert.equal(issue.score, 1);
});

test("detectIssue returns null with no issue types (present or absent key)", () => {
  assert.equal(detectIssue({ issueTypes: [] }, "x"), null);
  assert.equal(detectIssue({}, "x"), null);
});

test("detectIssue tolerates an issue with no keywords", () => {
  const data = { issueTypes: [{ id: "bare", label: "Bare" }] };
  const issue = detectIssue(data, "anything");
  assert.equal(issue.id, "bare");
  assert.equal(issue.score, 0);
});

test("detectJurisdiction picks the matching jurisdiction", () => {
  const j = detectJurisdiction(fixture(), "Patrakarpuram, Lucknow");
  assert.equal(j.id, "city");
  assert.equal(j.score, 1);
});

test("detectJurisdiction falls back to the last jurisdiction when nothing matches", () => {
  const j = detectJurisdiction(fixture(), "some unknown town");
  assert.equal(j.id, "statewide");
  assert.equal(j.score, 0);
});

test("detectJurisdiction returns null with no jurisdictions (present or absent key)", () => {
  assert.equal(detectJurisdiction({ jurisdictions: [] }, "x"), null);
  assert.equal(detectJurisdiction({}, "x"), null);
});

test("detectJurisdiction tolerates a jurisdiction with no matches", () => {
  const data = { jurisdictions: [{ id: "bare", label: "Bare" }] };
  const j = detectJurisdiction(data, "anything");
  assert.equal(j.id, "bare");
  assert.equal(j.score, 0);
});

test("resolveAccountability resolves a full chain and drops unknown officials", () => {
  const result = resolveAccountability(fixture(), "pothole on the road", "Lucknow");
  assert.equal(result.chainId, "city-road");
  assert.deepEqual(result.officials.map((o) => o.id), ["o1", "o2"]); // ghost dropped
  // base 0.7 + issue(+0.08) + jurisdiction(+0.08) = 0.86
  assert.ok(Math.abs(result.confidence - 0.86) < 1e-9);
  assert.equal(result.verifiedOn, "2026-01-01");
  assert.equal(result.notice, "test notice");
});

test("resolveAccountability falls back when the configured chain is missing", () => {
  // water -> ghost-chain (not in chains) -> district-administration fallback
  const result = resolveAccountability(fixture(), "dirty water", "Lucknow");
  assert.equal(result.chainId, "district-administration");
  assert.deepEqual(result.officials.map((o) => o.id), ["o1"]);
});

test("resolveAccountability uses district-administration when defaultChains is empty", () => {
  // statewide jurisdiction has empty defaultChains -> FALLBACK_CHAIN_ID
  const result = resolveAccountability(fixture(), "pothole road", "somewhere in up");
  assert.equal(result.jurisdiction.id, "statewide");
  assert.equal(result.chainId, "district-administration");
});

test("resolveAccountability uses the road chain when the issue has no mapping", () => {
  const data = fixture();
  // city jurisdiction maps road only; force a 'water' match with no water entry.
  data.jurisdictions[0].defaultChains = { road: "city-road" };
  const result = resolveAccountability(data, "no water supply", "Lucknow");
  assert.equal(result.issue.id, "water");
  assert.equal(result.chainId, "city-road"); // fell through to .road
});

test("resolveAccountability clamps confidence to the 0.25 floor", () => {
  const data = fixture();
  data.chains["district-administration"].confidence = 0.3;
  // no issue match (score 0) and fallback jurisdiction (score 0): 0.3 - 0.08 - 0.1 = 0.12 -> 0.25
  const result = resolveAccountability(data, "zzz", "zzz");
  assert.equal(result.confidence, 0.25);
});

test("resolveAccountability clamps confidence to the 0.95 ceiling", () => {
  const data = fixture();
  data.chains["city-road"].confidence = 0.95;
  // 0.95 + 0.08 + 0.08 = 1.11 -> 0.95
  const result = resolveAccountability(data, "pothole road", "Lucknow");
  assert.equal(result.confidence, 0.95);
});

test("resolveAccountability throws when the dataset is empty", () => {
  assert.throws(
    () => resolveAccountability({ issueTypes: [], jurisdictions: [] }, "x", "y"),
    /no issue types or jurisdictions/i
  );
});

test("resolveAccountability throws when even the fallback chain is missing", () => {
  const data = fixture();
  delete data.chains["district-administration"];
  data.jurisdictions[0].defaultChains = { road: "ghost-chain" };
  assert.throws(
    () => resolveAccountability(data, "pothole road", "Lucknow"),
    /no chain found/i
  );
});

test("integration: real dataset resolves the shipped examples", () => {
  const data = JSON.parse(
    fs.readFileSync(new URL("../data/accountability.json", import.meta.url), "utf8")
  );

  const pothole = resolveAccountability(
    data,
    "Broken road and pothole near a market crossing",
    "Patrakarpuram, Gomti Nagar, Lucknow"
  );
  assert.equal(pothole.issue.id, "road");
  assert.equal(pothole.jurisdiction.id, "lucknow-municipal");
  assert.equal(pothole.chainId, "lucknow-municipal-road");
  assert.ok(pothole.officials.length > 0);
  assert.ok(pothole.officials.every((o) => o.name));

  const rural = resolveAccountability(
    data,
    "Broken rural road near village approach",
    "Mohanlalganj, Lucknow rural"
  );
  assert.equal(rural.jurisdiction.id, "lucknow-district-rural");
  assert.equal(rural.chainId, "up-pwd-road");
});
