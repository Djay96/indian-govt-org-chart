const state = {
  data: null,
  result: null
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);

async function loadData() {
  const response = await fetch("/data/accountability.json");
  state.data = await response.json();
  renderSources();
}

function normalize(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function detectIssue(description) {
  const text = normalize(description);
  let winner = state.data.issueTypes[0];
  let topScore = 0;

  for (const issue of state.data.issueTypes) {
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
  let best = state.data.jurisdictions[state.data.jurisdictions.length - 1];
  let score = 0;

  for (const jurisdiction of state.data.jurisdictions) {
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
  const chain = state.data.chains[chainId];
  const officials = chain.officials.map((id) => ({ id, ...state.data.officials[id] }));
  const confidence = Math.min(0.95, Math.max(0.25, chain.confidence + (issue.score ? 0.08 : -0.08) + (jurisdiction.score ? 0.08 : -0.1)));

  return {
    issue,
    jurisdiction,
    chainId,
    chain,
    officials,
    confidence,
    description,
    location
  };
}

function contactLine(contact) {
  const parts = [];
  if (contact.email) parts.push(contact.email);
  if (contact.phone) parts.push(contact.phone);
  if (contact.alternatePhones?.length) parts.push(contact.alternatePhones.join(", "));
  return parts.length ? parts.join(" | ") : "Contact to verify";
}

function renderSources() {
  $("#sources").innerHTML = state.data.sources.map((source) => `
    <a href="${source.url}" target="_blank" rel="noreferrer">
      <span>${escapeHtml(source.label)}</span>
      <small>${escapeHtml(source.usedFor)}</small>
    </a>
  `).join("");
  $("#verifiedOn").textContent = state.data.verifiedOn;
}

function syncFeedbackContext(result) {
  $("#feedbackChain").value = result?.chain?.label || "";
  $("#feedbackIssue").value = result ? `${result.issue.label} at ${result.location}` : "";
}

function renderResult(result) {
  const percent = Math.round(result.confidence * 100);
  const primary = result.officials[0];
  $("#resultEmpty").hidden = true;
  $("#resultPanel").hidden = false;
  $("#matchSummary").innerHTML = `
    <div class="answer-card">
      <div>
        <span class="eyebrow">Start here</span>
        <h2>${escapeHtml(primary.name)}</h2>
        <p>${escapeHtml(primary.title)} · ${escapeHtml(primary.office)}</p>
      </div>
      <div class="answer-contact">
        <strong>${escapeHtml(contactLine(primary.contact))}</strong>
        <span>${escapeHtml(primary.contact.address || "Address not listed")}</span>
      </div>
    </div>
    <div class="route-card">
      <div>
        <span class="eyebrow">Matched route</span>
        <h3>${escapeHtml(result.chain.label)}</h3>
        <p>${escapeHtml(result.chain.ownershipTest)}</p>
      </div>
      <div class="confidence" aria-label="Match confidence ${percent} percent">
        <strong>${percent}%</strong>
        <span>confidence</span>
      </div>
    </div>
  `;

  $("#classification").innerHTML = `
    <span>${escapeHtml(result.issue.label)}</span>
    <span>${escapeHtml(result.jurisdiction.label)}</span>
    <span>${escapeHtml(result.chain.department)}</span>
  `;

  $("#officialChain").innerHTML = `
    <div class="chain-heading">
      <span class="eyebrow">Escalation ladder</span>
      <h2>${result.officials.length} accountability steps</h2>
    </div>
    ${result.officials.map((official, index) => `
    <article class="official ${official.verified ? "verified" : "needs-check"}">
      <div class="step">${index + 1}</div>
      <div>
        <div class="official-topline">
          <h3>${escapeHtml(official.name)}</h3>
          <span>${official.verified ? "Verified contact" : "Verify posting"}</span>
        </div>
        <p>${escapeHtml(official.title)} · ${escapeHtml(official.office)}</p>
        <dl>
          <div><dt>Level</dt><dd>${escapeHtml(official.level)}</dd></div>
          <div><dt>Contact</dt><dd>${escapeHtml(contactLine(official.contact))}</dd></div>
          <div><dt>Address</dt><dd>${escapeHtml(official.contact.address || "Not listed")}</dd></div>
        </dl>
        ${official.note ? `<p class="note">${escapeHtml(official.note)}</p>` : ""}
        <a class="source-link" href="${official.source}" target="_blank" rel="noreferrer">Source</a>
      </div>
    </article>
  `).join("")}`;
}

function buildEmail(result) {
  const primary = result.officials[0];
  const cc = result.officials.slice(1).map((official) => official.contact.email).filter(Boolean);
  const subject = `Complaint: ${result.issue.label} at ${result.location}`;
  const chainText = result.officials.map((official, index) =>
    `${index + 1}. ${official.name}, ${official.title}, ${official.office} (${contactLine(official.contact)})`
  ).join("\n");
  const body = `To,\n${primary.name}\n${primary.office}\n\nI am reporting the following public issue:\n\nIssue: ${result.description}\nExact location: ${result.location}\nMatched department: ${result.chain.department}\n\nRequested action:\nPlease inspect the location, confirm ownership of the road/service, register a complaint number, and share the expected date for repair/resolution. If this office is not the owning agency, please forward it to the correct officer and inform me of the transfer.\n\nEscalation chain for reference:\n${chainText}\n\nSource verification date: ${state.data.verifiedOn}\n\nRegards,\n[Your name]\n[Your phone]\n[Your address]`;

  return { to: primary.contact.email || "", cc, subject, body };
}

function renderEmail(result) {
  const email = buildEmail(result);
  $("#toField").textContent = email.to || "Primary email needs verification";
  $("#ccField").textContent = email.cc.join(", ") || "No verified CC emails available";
  $("#draftText").value = `Subject: ${email.subject}\n\n${email.body}`;
  const params = new URLSearchParams({
    subject: email.subject,
    body: email.body
  });
  if (email.cc.length) params.set("cc", email.cc.join(","));
  $("#mailtoLink").href = `mailto:${email.to}?${params.toString()}`;
}

async function copyDraft() {
  const text = $("#draftText").value;
  await navigator.clipboard.writeText(text);
  $("#copyDraft").textContent = "Copied";
  setTimeout(() => {
    $("#copyDraft").textContent = "Copy draft";
  }, 1300);
}

async function handleSubmit(event) {
  event.preventDefault();
  const description = $("#issue").value.trim();
  const location = $("#location").value.trim();
  if (!description || !location) return;

  $("#submitButton").disabled = true;
  $("#submitButton").textContent = "Resolving";

  try {
    let result;
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, location })
      });
      if (!response.ok) throw new Error("API unavailable");
      result = await response.json();
    } catch {
      result = resolveAccountability(description, location);
    }

    state.result = result;
    renderResult(result);
    renderEmail(result);
    syncFeedbackContext(result);
    $("#resultPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  } finally {
    $("#submitButton").disabled = false;
    $("#submitButton").textContent = "Find accountability";
  }
}

async function handleFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#feedbackButton");
  const status = $("#feedbackStatus");
  const formData = new FormData(form);

  button.disabled = true;
  button.textContent = "Sending";
  status.textContent = "";

  try {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    });

    if (!response.ok) throw new Error("Feedback failed");
    form.reset();
    syncFeedbackContext(state.result);
    status.textContent = "Thanks. The correction was submitted.";
  } catch {
    status.textContent = "Could not send it here. Please try again after deployment.";
  } finally {
    button.disabled = false;
    button.textContent = "Send correction";
  }
}

function fillExample(event) {
  const button = event.target.closest("[data-example]");
  if (!button) return;
  const [issue, location] = button.dataset.example.split("||");
  $("#issue").value = issue;
  $("#location").value = location;
  $("#matrixForm").dispatchEvent(new Event("submit", { cancelable: true }));
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  $("#matrixForm").addEventListener("submit", handleSubmit);
  $("#examples").addEventListener("click", fillExample);
  $("#copyDraft").addEventListener("click", copyDraft);
  $("#feedbackForm").addEventListener("submit", handleFeedback);
});
