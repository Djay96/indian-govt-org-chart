import test from "node:test";
import assert from "node:assert/strict";

import { validateData, loadData } from "../scripts/validate-data.mjs";

// Minimal valid dataset; each test clones and breaks one thing.
const valid = () => ({
  verifiedOn: "2026-06-01",
  issueTypes: [{ id: "road", label: "Road", keywords: ["pothole"] }],
  jurisdictions: [
    { id: "city", label: "City", matches: ["lucknow"], defaultChains: { road: "city-road" } }
  ],
  officials: {
    o1: { name: "A", title: "T", office: "O", contact: {} }
  },
  chains: {
    "city-road": { label: "City Road", officials: ["o1"] },
    "district-administration": { label: "Fallback", officials: ["o1"] }
  }
});

test("validateData accepts a well-formed dataset and returns a summary", () => {
  const summary = validateData(valid());
  assert.deepEqual(summary, { officials: 1, chains: 2, issueTypes: 1, jurisdictions: 1 });
});

test("validateData rejects a missing top-level key", () => {
  const data = valid();
  delete data.chains;
  assert.throws(() => validateData(data), /Missing top-level key: chains/);
});

test("validateData rejects an issue type with no id or keywords", () => {
  const data = valid();
  data.issueTypes = [{ label: "Bad" }];
  assert.throws(() => validateData(data), /needs an id and non-empty keywords/);

  const data2 = valid();
  data2.issueTypes = [{ id: "x", label: "X", keywords: [] }];
  assert.throws(() => validateData(data2), /needs an id and non-empty keywords/);
});

test("validateData rejects an official missing a required field", () => {
  const data = valid();
  delete data.officials.o1.contact;
  assert.throws(() => validateData(data), /Official o1 missing contact/);
});

test("validateData rejects a chain with no officials", () => {
  const data = valid();
  data.chains["city-road"].officials = [];
  assert.throws(() => validateData(data), /Chain city-road has no officials/);
});

test("validateData rejects a chain referencing an unknown official", () => {
  const data = valid();
  data.chains["city-road"].officials = ["ghost"];
  assert.throws(() => validateData(data), /references unknown official ghost/);
});

test("validateData rejects a jurisdiction mapping to an unknown chain", () => {
  const data = valid();
  data.jurisdictions[0].defaultChains = { road: "ghost-chain" };
  assert.throws(() => validateData(data), /maps road to unknown chain ghost-chain/);
});

test("validateData tolerates a jurisdiction with no defaultChains", () => {
  const data = valid();
  delete data.jurisdictions[0].defaultChains;
  assert.doesNotThrow(() => validateData(data));
});

test("validateData requires the district-administration fallback chain", () => {
  const data = valid();
  delete data.chains["district-administration"];
  assert.throws(() => validateData(data), /Missing required fallback chain/);
});

test("loadData reads and validates the shipped dataset", () => {
  const data = loadData();
  assert.doesNotThrow(() => validateData(data));
});
