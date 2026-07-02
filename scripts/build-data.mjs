#!/usr/bin/env node
/**
 * Build queryable JSON from Accountable India CSV dataset.
 * Outputs public/data/accountable-india.json and public/data/ai-context.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "Accountable India", "data");
const OUT_DIR = path.join(ROOT, "public", "data");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      const raw = cells[idx] ?? "";
      if (raw === "" || raw === "NULL") {
        obj[h] = null;
      } else if (/^-?\d+$/.test(raw)) {
        obj[h] = Number(raw);
      } else if (/^-?\d+\.\d+$/.test(raw)) {
        obj[h] = Number(raw);
      } else if (raw === "true" || raw === "false") {
        obj[h] = raw === "true";
      } else {
        obj[h] = raw;
      }
    });
    return obj;
  });
}

function readCsv(name) {
  const file = path.join(DATA_DIR, `${name}.csv`);
  return parseCsv(fs.readFileSync(file, "utf8"));
}

function indexBy(arr, key) {
  const map = new Map();
  for (const item of arr) map.set(item[key], item);
  return map;
}

function groupBy(arr, key) {
  const map = new Map();
  for (const item of arr) {
    const k = item[key] ?? "unknown";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

function buildSearchIndex(records) {
  return records.map((r) => ({
    id: r.id,
    type: r._type,
    label: r._label,
    subtitle: r._subtitle,
    keywords: r._keywords,
    data: r,
  }));
}

function main() {
  const jurisdictions = readCsv("jurisdictions");
  const bodies = readCsv("bodies");
  const positions = readCsv("positions");
  const persons = readCsv("persons");
  const appointments = readCsv("appointments");
  const contacts = readCsv("contacts");
  const topics = readCsv("topics");
  const responsibilityMap = readCsv("responsibility_map");
  const sources = readCsv("sources");
  const collectionLog = readCsv("collection_log");

  const jurisdictionMap = indexBy(jurisdictions, "id");
  const bodyMap = indexBy(bodies, "id");
  const positionMap = indexBy(positions, "id");
  const personMap = indexBy(persons, "id");
  const topicMap = indexBy(topics, "id");

  const currentAppointments = appointments.filter((a) => a.is_current);
  const positionHolder = new Map();
  for (const appt of currentAppointments) {
    positionHolder.set(appt.position_id, appt.person_id);
  }

  const enrichedPositions = positions.map((p) => {
    const jurisdiction = jurisdictionMap.get(p.jurisdiction_id);
    const body = p.body_id ? bodyMap.get(p.body_id) : null;
    const personId = positionHolder.get(p.id);
    const person = personId ? personMap.get(personId) : null;
    const reportsTo = p.reports_to_position_id
      ? positionMap.get(p.reports_to_position_id)
      : null;
    return {
      ...p,
      jurisdiction_name: jurisdiction?.name ?? null,
      jurisdiction_level: jurisdiction?.level ?? null,
      state_code: jurisdiction?.state_code ?? null,
      body_name: body?.name ?? null,
      body_type: body?.body_type ?? null,
      person_name: person?.full_name ?? null,
      person_party: person?.party ?? null,
      reports_to_title: reportsTo?.title ?? null,
    };
  });

  const enrichedAppointments = appointments.map((a) => {
    const person = personMap.get(a.person_id);
    const position = positionMap.get(a.position_id);
    const jurisdiction = position
      ? jurisdictionMap.get(position.jurisdiction_id)
      : null;
    return {
      ...a,
      person_name: person?.full_name ?? null,
      position_title: position?.title ?? null,
      jurisdiction_name: jurisdiction?.name ?? null,
      jurisdiction_level: jurisdiction?.level ?? null,
    };
  });

  const enrichedContacts = contacts.map((c) => ({
    ...c,
    position_title: c.position_id
      ? positionMap.get(c.position_id)?.title
      : null,
    person_name: c.person_id ? personMap.get(c.person_id)?.full_name : null,
    body_name: c.body_id ? bodyMap.get(c.body_id)?.name : null,
    jurisdiction_name: c.jurisdiction_id
      ? jurisdictionMap.get(c.jurisdiction_id)?.name
      : null,
  }));

  const enrichedResponsibility = responsibilityMap.map((r) => ({
    ...r,
    topic_name: topicMap.get(r.topic_id)?.name ?? null,
    body_name: r.body_id ? bodyMap.get(r.body_id)?.name : null,
    position_title: r.position_id
      ? positionMap.get(r.position_id)?.title
      : null,
  }));

  const states = jurisdictions.filter(
    (j) => j.level === "state" || j.level === "ut"
  );
  const districts = jurisdictions.filter((j) => j.level === "district");
  const municipal = jurisdictions.filter(
    (j) =>
      j.level === "municipal_corporation" ||
      j.level === "municipality" ||
      j.level === "town_panchayat"
  );

  const positionsByLevel = groupBy(enrichedPositions, "jurisdiction_level");
  const positionsByType = groupBy(positions, "position_type");
  const positionsByStatus = groupBy(positions, "data_status");
  const contactsByType = groupBy(contacts, "contact_type");
  const jurisdictionsByLevel = groupBy(jurisdictions, "level");

  const filledPositions = enrichedPositions.filter((p) => p.person_name);
  const vacantPositions = enrichedPositions.filter((p) => p.is_vacant);
  const verifiedPositions = positions.filter((p) => p.data_status === "verified");

  const stateStats = states.map((s) => {
    const stateDistricts = districts.filter((d) => d.parent_id === s.id);
    const statePositions = enrichedPositions.filter(
      (p) =>
        p.jurisdiction_id === s.id ||
        stateDistricts.some((d) => d.id === p.jurisdiction_id)
    );
    const dms = statePositions.filter(
      (p) =>
        p.title?.toLowerCase().includes("district magistrate") ||
        p.title?.toLowerCase().includes("collector")
    );
    const filledDms = dms.filter((p) => p.person_name);
    return {
      id: s.id,
      name: s.name,
      state_code: s.state_code,
      level: s.level,
      districts: stateDistricts.length,
      positions: statePositions.length,
      dms_total: dms.length,
      dms_filled: filledDms.length,
      data_status: s.data_status,
    };
  });

  const searchRecords = [
    ...enrichedPositions.map((p) => ({
      ...p,
      _type: "position",
      _label: p.title,
      _subtitle: [p.person_name, p.jurisdiction_name].filter(Boolean).join(" · "),
      _keywords: [
        p.title,
        p.person_name,
        p.jurisdiction_name,
        p.body_name,
        p.position_type,
      ]
        .filter(Boolean)
        .join(" "),
    })),
    ...persons.map((p) => ({
      ...p,
      _type: "person",
      _label: p.full_name,
      _subtitle: p.party ?? p.honorific ?? "",
      _keywords: [p.full_name, p.party, p.honorific].filter(Boolean).join(" "),
    })),
    ...jurisdictions.map((j) => ({
      ...j,
      _type: "jurisdiction",
      _label: j.name,
      _subtitle: j.level,
      _keywords: [j.name, j.level, j.state_code, j.region].filter(Boolean).join(" "),
    })),
    ...bodies.map((b) => ({
      ...b,
      _type: "body",
      _label: b.name,
      _subtitle: bodyMap.get(b.jurisdiction_id)?.name ?? b.body_type,
      _keywords: [b.name, b.short_name, b.body_type].filter(Boolean).join(" "),
    })),
    ...topics.map((t) => ({
      ...t,
      _type: "topic",
      _label: t.name,
      _subtitle: t.keywords ?? "",
      _keywords: [t.name, t.keywords, t.description].filter(Boolean).join(" "),
    })),
  ];

  const metrics = {
    generatedAt: new Date().toISOString(),
    counts: {
      jurisdictions: jurisdictions.length,
      states: states.length,
      districts: districts.length,
      municipal: municipal.length,
      bodies: bodies.length,
      positions: positions.length,
      persons: persons.length,
      appointments: appointments.length,
      currentAppointments: currentAppointments.length,
      contacts: contacts.length,
      topics: topics.length,
      responsibilityMappings: responsibilityMap.length,
      sources: sources.length,
      collectionRuns: collectionLog.length,
    },
    coverage: {
      positionsFilled: filledPositions.length,
      positionsVacant: vacantPositions.length,
      positionsVerified: verifiedPositions.length,
      fillRate:
        positions.length > 0
          ? Math.round((filledPositions.length / positions.length) * 1000) / 10
          : 0,
      verificationRate:
        positions.length > 0
          ? Math.round((verifiedPositions.length / positions.length) * 1000) / 10
          : 0,
    },
    breakdowns: {
      positionsByLevel: Object.fromEntries(
        [...positionsByLevel.entries()].map(([k, v]) => [k, v.length])
      ),
      positionsByType: Object.fromEntries(
        [...positionsByType.entries()].map(([k, v]) => [k, v.length])
      ),
      positionsByStatus: Object.fromEntries(
        [...positionsByStatus.entries()].map(([k, v]) => [k, v.length])
      ),
      contactsByType: Object.fromEntries(
        [...contactsByType.entries()].map(([k, v]) => [k, v.length])
      ),
      jurisdictionsByLevel: Object.fromEntries(
        [...jurisdictionsByLevel.entries()].map(([k, v]) => [k, v.length])
      ),
    },
    stateStats,
    latestCollection: collectionLog[collectionLog.length - 1] ?? null,
  };

  const dataset = {
    meta: {
      name: "Accountable India",
      description:
        "Connected dataset of every government office in India — org chart, contacts, and responsibility mapping.",
      version: "1.0.0",
      generatedAt: metrics.generatedAt,
    },
    metrics,
    jurisdictions,
    bodies,
    positions: enrichedPositions,
    persons,
    appointments: enrichedAppointments,
    contacts: enrichedContacts,
    topics,
    responsibilityMap: enrichedResponsibility,
    sources,
    collectionLog,
    searchIndex: buildSearchIndex(searchRecords),
  };

  const aiContext = {
    generatedAt: metrics.generatedAt,
    summary: `Accountable India is a government accountability dataset covering India at Union, State/UT, District, and Local levels.
Total jurisdictions: ${metrics.counts.jurisdictions} (${metrics.counts.states} states/UTs, ${metrics.counts.districts} districts).
Total positions (offices): ${metrics.counts.positions}, with ${metrics.coverage.positionsFilled} currently filled (${metrics.coverage.fillRate}% fill rate).
Total persons tracked: ${metrics.counts.persons}. Current appointments: ${metrics.counts.currentAppointments}.
Official contacts: ${metrics.counts.contacts}. Citizen problem topics: ${metrics.counts.topics}.
Data verification: ${metrics.coverage.verificationRate}% of positions verified.`,
    metrics,
    topStatesByDistricts: stateStats
      .sort((a, b) => b.districts - a.districts)
      .slice(0, 10)
      .map((s) => `${s.name}: ${s.districts} districts, ${s.dms_filled}/${s.dms_total} DMs named`),
    positionTypes: metrics.breakdowns.positionsByType,
    contactTypes: metrics.breakdowns.contactsByType,
    samplePositions: enrichedPositions
      .filter((p) => p.person_name && p.rank_level && p.rank_level <= 3)
      .slice(0, 30)
      .map(
        (p) =>
          `${p.title} — ${p.person_name} (${p.jurisdiction_name}, ${p.jurisdiction_level})`
      ),
    topics: topics.map((t) => ({
      name: t.name,
      keywords: t.keywords,
      description: t.description,
    })),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "accountable-india.json"),
    JSON.stringify(dataset)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "ai-context.json"),
    JSON.stringify(aiContext)
  );

  console.log(`Built dataset: ${dataset.searchIndex.length} searchable records`);
  console.log(`Output: ${OUT_DIR}/accountable-india.json (${(fs.statSync(path.join(OUT_DIR, "accountable-india.json")).size / 1024 / 1024).toFixed(2)} MB)`);
}

main();
