import test from "node:test";
import assert from "node:assert/strict";

import handler from "../netlify/functions/resolve.js";

const post = (payload, json) =>
  handler({ method: "POST", json: json ?? (async () => payload) });

test("function returns 405 for non-POST methods", async () => {
  const res = await handler({ method: "GET" });
  assert.equal(res.status, 405);
});

test("function returns 400 when description or location is blank", async () => {
  const res = await post({ description: "", location: "" });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /required/i);
});

test("function returns 400 when fields are whitespace only", async () => {
  const res = await post({ description: "   ", location: "Lucknow" });
  assert.equal(res.status, 400);
});

test("function resolves a valid request", async () => {
  const res = await post({
    description: "pothole on the road",
    location: "Gomti Nagar, Lucknow"
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.chainId, "lucknow-municipal-road");
  assert.ok(body.officials.length > 0);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("function defaults missing body fields to empty (400)", async () => {
  const res = await post({});
  assert.equal(res.status, 400);
});

test("function returns 500 when the body cannot be parsed", async () => {
  const res = await post(null, async () => {
    throw new Error("bad json");
  });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.match(body.error, /could not resolve/i);
});
