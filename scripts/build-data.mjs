#!/usr/bin/env node
/**
 * Build queryable JSON from Accountable India CSV dataset.
 * Outputs public/data/accountable-india.json and public/data/ai-context.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCsvDocument } from "./csv-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "Accountable India", "data");
const OUT_DIR = path.join(ROOT, "public", "data");

function readCsv(name) {
  const file = path.join(DATA_DIR, `${name}.csv`);
  return readCsvDocument(file).rows;
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

function positionAliases(title) {
  const normalized = title?.toLowerCase() ?? "";
  const aliases = [];
  if (
    normalized.includes("district magistrate") ||
    normalized.includes("collector")
  ) {
    aliases.push("DM", "District Magistrate", "District Collector");
  }
  if (normalized.includes("superintendent of police")) {
    aliases.push("SP", "Superintendent of Police");
  }
  if (normalized.includes("chief minister")) aliases.push("CM");
  if (normalized.includes("prime minister")) aliases.push("PM");
  if (normalized.includes("chief secretary")) aliases.push("CS");
  if (normalized.includes("municipal commissioner")) {
    aliases.push("City Commissioner", "Municipal Commissioner");
  }
  return aliases;
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
    const parentJurisdiction = jurisdiction?.parent_id
      ? jurisdictionMap.get(jurisdiction.parent_id)
      : null;
    const state =
      jurisdiction?.level === "state" || jurisdiction?.level === "ut"
        ? jurisdiction
        : parentJurisdiction?.level === "state" ||
            parentJurisdiction?.level === "ut"
          ? parentJurisdiction
          : null;
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
      state_name: state?.name ?? null,
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

  const contactsByPosition = groupBy(
    enrichedContacts.filter((contact) => contact.position_id),
    "position_id"
  );
  const contactsByBody = groupBy(
    enrichedContacts.filter((contact) => contact.body_id),
    "body_id"
  );

  const states = jurisdictions.filter(
    (j) => j.level === "state" || j.level === "ut"
  );
  const districts = jurisdictions.filter((j) => j.level === "district");
  const municipal = bodies.filter((b) => b.body_type === "local_body");

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
      _subtitle: jurisdictionMap.get(b.jurisdiction_id)?.name ?? b.body_type,
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
      positionsUnfilled: positions.length - filledPositions.length,
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

  const positionGroundingRecords = enrichedPositions.map((position) => ({
    id: `position:${position.id}`,
    kind: "position",
    title: position.title,
    holder: position.person_name,
    jurisdiction: position.jurisdiction_name,
    state: position.state_name,
    level: position.jurisdiction_level,
    body: position.body_name,
    reportsTo: position.reports_to_title,
    aliases: positionAliases(position.title),
    contacts: (contactsByPosition.get(position.id) ?? [])
      .filter((contact) => contact.is_public)
      .slice(0, 8)
      .map((contact) => ({
        type: contact.contact_type,
        value: contact.value,
        label: contact.label,
        verified: contact.is_verified,
      })),
    status: position.data_status,
    confidence: position.confidence,
    sourceUrl: position.source_url,
  }));

  const bodyGroundingRecords = bodies.map((body) => ({
    id: `body:${body.id}`,
    kind: "body",
    name: body.name,
    shortName: body.short_name,
    bodyType: body.body_type,
    jurisdiction: jurisdictionMap.get(body.jurisdiction_id)?.name ?? null,
    website: body.official_website,
    contacts: (contactsByBody.get(body.id) ?? [])
      .filter((contact) => contact.is_public)
      .slice(0, 8)
      .map((contact) => ({
        type: contact.contact_type,
        value: contact.value,
        label: contact.label,
        verified: contact.is_verified,
      })),
    status: body.data_status,
    confidence: body.confidence,
    sourceUrl: body.source_url,
  }));

  const responsibilityGroundingRecords = enrichedResponsibility.map(
    (responsibility) => ({
      id: `responsibility:${responsibility.id}`,
      kind: "responsibility",
      topic: responsibility.topic_name,
      keywords: topicMap.get(responsibility.topic_id)?.keywords ?? null,
      jurisdictionLevel: responsibility.jurisdiction_level,
      body: responsibility.body_name,
      position: responsibility.position_title,
      priority: responsibility.priority,
      notes: responsibility.notes,
      sourceUrl: responsibility.source_url,
    })
  );

  const mappedTopicIds = new Set(
    responsibilityMap.map((responsibility) => responsibility.topic_id)
  );
  const unmappedTopicGroundingRecords = topics
    .filter((topic) => !mappedTopicIds.has(topic.id))
    .map((topic) => ({
      id: `topic:${topic.id}`,
      kind: "topic",
      topic: topic.name,
      keywords: topic.keywords,
      description: topic.description,
      mappingStatus: "No responsibility mapping is currently available",
    }));

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
    topics: topics.map((t) => ({
      name: t.name,
      keywords: t.keywords,
      description: t.description,
    })),
    groundingRecords: [
      ...positionGroundingRecords,
      ...bodyGroundingRecords,
      ...responsibilityGroundingRecords,
      ...unmappedTopicGroundingRecords,
    ],
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
