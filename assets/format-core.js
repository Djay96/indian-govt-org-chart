// Pure formatting + email-drafting helpers. No DOM, no module state, so the
// browser (assets/app.js) and the test suite share the same code.

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;"
};

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

// Only allow http(s) URLs into href attributes; anything else becomes "#".
export function safeUrl(value = "") {
  return /^https?:\/\//i.test(value) ? escapeHtml(value) : "#";
}

export function contactLine(contact = {}) {
  const parts = [];
  if (contact.email) parts.push(contact.email);
  if (contact.phone) parts.push(contact.phone);
  if (contact.alternatePhones?.length) parts.push(contact.alternatePhones.join(", "));
  return parts.length ? parts.join(" | ") : "Contact to verify";
}

// Build the escalation email from a resolved result. Returns the parts the UI
// needs (to / cc / subject / body); rendering and mailto links stay in app.js.
export function buildEmail(result) {
  const primary = result.officials[0];
  const cc = result.officials
    .slice(1)
    .map((official) => official.contact.email)
    .filter(Boolean);

  const subject = `Complaint: ${result.issue.label} at ${result.location}`;
  const chainText = result.officials
    .map(
      (official, index) =>
        `${index + 1}. ${official.name}, ${official.title}, ${official.office} (${contactLine(official.contact)})`
    )
    .join("\n");

  const body = `To,\n${primary.name}\n${primary.office}\n\nI am reporting the following public issue:\n\nIssue: ${result.description}\nExact location: ${result.location}\nMatched department: ${result.chain.department}\n\nRequested action:\nPlease inspect the location, confirm ownership of the road/service, register a complaint number, and share the expected date for repair/resolution. If this office is not the owning agency, please forward it to the correct officer and inform me of the transfer.\n\nEscalation chain for reference:\n${chainText}\n\nSource verification date: ${result.verifiedOn}\n\nRegards,\n[Your name]\n[Your phone]\n[Your address]`;

  return { to: primary.contact.email || "", cc, subject, body };
}
