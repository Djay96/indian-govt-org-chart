import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  safeUrl,
  contactLine,
  buildEmail
} from "../assets/format-core.js";

test("escapeHtml escapes all HTML-significant characters", () => {
  assert.equal(
    escapeHtml(`<a href="x" title='y'>&</a>`),
    "&lt;a href=&quot;x&quot; title=&#039;y&#039;&gt;&amp;&lt;/a&gt;"
  );
});

test("escapeHtml defaults missing input and coerces non-strings", () => {
  assert.equal(escapeHtml(), "");
  assert.equal(escapeHtml(42), "42");
});

test("safeUrl passes http and https through (escaped)", () => {
  assert.equal(safeUrl("https://lmc.up.nic.in/x?a=1&b=2"), "https://lmc.up.nic.in/x?a=1&amp;b=2");
  assert.equal(safeUrl("http://example.org"), "http://example.org");
});

test("safeUrl rejects non-http schemes and empty input", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "#");
  assert.equal(safeUrl("mailto:x@y.z"), "#");
  assert.equal(safeUrl(), "#");
});

test("contactLine joins email, phone and alternate phones", () => {
  assert.equal(
    contactLine({ email: "a@b.c", phone: "123", alternatePhones: ["456", "789"] }),
    "a@b.c | 123 | 456, 789"
  );
});

test("contactLine handles partial contacts", () => {
  assert.equal(contactLine({ phone: "123" }), "123");
  assert.equal(contactLine({ email: "a@b.c", alternatePhones: [] }), "a@b.c");
});

test("contactLine falls back when nothing is present", () => {
  assert.equal(contactLine({}), "Contact to verify");
  assert.equal(contactLine(), "Contact to verify");
});

const resultFixture = () => ({
  issue: { label: "Road or pothole" },
  chain: { department: "Lucknow Nagar Nigam" },
  description: "Deep pothole",
  location: "Gomti Nagar, Lucknow",
  verifiedOn: "2026-06-01",
  officials: [
    {
      name: "Control Room",
      title: "Intake",
      office: "LMC",
      contact: { email: "nnlko@nic.in", phone: "1533" }
    },
    {
      name: "Nagar Ayukt",
      title: "Commissioner",
      office: "LMC HQ",
      contact: { email: "cmr@nic.in", phone: "999" }
    },
    {
      name: "Unreachable Officer",
      title: "Engineer",
      office: "Division",
      contact: {} // no email -> excluded from cc
    }
  ]
});

test("buildEmail addresses the primary official and CCs the rest with emails", () => {
  const email = buildEmail(resultFixture());
  assert.equal(email.to, "nnlko@nic.in");
  assert.deepEqual(email.cc, ["cmr@nic.in"]); // third official has no email
  assert.equal(email.subject, "Complaint: Road or pothole at Gomti Nagar, Lucknow");
});

test("buildEmail body embeds the numbered chain, department and verify date", () => {
  const { body } = buildEmail(resultFixture());
  assert.match(body, /1\. Control Room, Intake, LMC \(nnlko@nic\.in \| 1533\)/);
  assert.match(body, /2\. Nagar Ayukt, Commissioner, LMC HQ/);
  assert.match(body, /3\. Unreachable Officer, Engineer, Division \(Contact to verify\)/);
  assert.match(body, /Matched department: Lucknow Nagar Nigam/);
  assert.match(body, /Source verification date: 2026-06-01/);
});

test("buildEmail leaves 'to' empty when the primary has no email", () => {
  const data = resultFixture();
  data.officials[0].contact = { phone: "1533" };
  const email = buildEmail(data);
  assert.equal(email.to, "");
});
