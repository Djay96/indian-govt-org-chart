#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCsvDocument } from "./csv-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_DIR = path.resolve(
  __dirname,
  "..",
  "Accountable India",
  "data"
);

export const EXPECTED_HEADERS = {
  jurisdictions: [
    "id",
    "name",
    "level",
    "parent_id",
    "state_code",
    "lgd_code",
    "region",
    "official_website",
    "source_url",
    "confidence",
    "data_status",
    "last_verified_at",
  ],
  bodies: [
    "id",
    "jurisdiction_id",
    "parent_body_id",
    "name",
    "short_name",
    "body_type",
    "description",
    "official_website",
    "source_url",
    "confidence",
    "data_status",
    "last_verified_at",
  ],
  positions: [
    "id",
    "body_id",
    "jurisdiction_id",
    "reports_to_position_id",
    "title",
    "position_type",
    "branch",
    "rank_level",
    "is_vacant",
    "description",
    "source_url",
    "confidence",
    "data_status",
    "last_verified_at",
  ],
  persons: [
    "id",
    "full_name",
    "honorific",
    "gender",
    "party",
    "photo_url",
    "bio",
    "education",
    "date_of_birth",
    "wikipedia_url",
    "source_url",
    "confidence",
    "data_status",
    "last_verified_at",
  ],
  appointments: [
    "id",
    "person_id",
    "position_id",
    "start_date",
    "end_date",
    "is_current",
    "appointment_type",
    "notes",
    "source_url",
    "confidence",
    "data_status",
    "last_verified_at",
  ],
  contacts: [
    "id",
    "position_id",
    "person_id",
    "body_id",
    "jurisdiction_id",
    "contact_type",
    "value",
    "label",
    "is_public",
    "is_verified",
    "source_url",
    "confidence",
    "last_verified_at",
  ],
  topics: ["id", "name", "parent_topic_id", "keywords", "description"],
  responsibility_map: [
    "id",
    "topic_id",
    "body_id",
    "position_id",
    "jurisdiction_level",
    "priority",
    "notes",
    "source_url",
  ],
  sources: [
    "id",
    "entity_type",
    "entity_id",
    "source_name",
    "source_url",
    "retrieved_at",
    "confidence",
    "notes",
  ],
  collection_log: [
    "id",
    "run_date",
    "run_type",
    "scope",
    "records_added",
    "records_updated",
    "records_flagged",
    "status",
    "next_target",
    "notes",
  ],
};

const REQUIRED_VALUES = {
  jurisdictions: ["id", "name", "level"],
  bodies: ["id", "jurisdiction_id", "name", "body_type"],
  positions: ["id", "jurisdiction_id", "title", "position_type"],
  persons: ["id", "full_name"],
  appointments: ["id", "person_id", "position_id", "is_current"],
  contacts: ["id", "contact_type", "value", "is_public"],
  topics: ["id", "name"],
  responsibility_map: ["id", "topic_id", "jurisdiction_level"],
  sources: ["id", "entity_type", "entity_id", "source_url"],
  collection_log: ["id", "run_date", "run_type", "status"],
};

const ENUMS = {
  "jurisdictions.level": [
    "union",
    "state",
    "ut",
    "division",
    "district",
    "sub_district",
    "block",
    "municipal_corporation",
    "municipality",
    "town_panchayat",
    "district_panchayat",
    "block_panchayat",
    "gram_panchayat",
    "ward",
  ],
  "bodies.body_type": [
    "ministry",
    "department",
    "directorate",
    "agency",
    "board",
    "commission",
    "authority",
    "public_sector_unit",
    "local_body",
    "wing",
    "division",
    "office",
  ],
  "positions.position_type": [
    "constitutional",
    "political_executive",
    "elected_representative",
    "bureaucratic",
    "judicial",
    "appointed",
    "staff",
  ],
  "positions.branch": [
    "executive",
    "legislative",
    "judicial",
    "administrative",
  ],
  "persons.gender": ["male", "female", "other", "undisclosed"],
  "appointments.appointment_type": [
    "elected",
    "appointed",
    "nominated",
    "acting",
    "additional_charge",
  ],
  "contacts.contact_type": [
    "office_email",
    "office_phone",
    "office_fax",
    "helpline",
    "grievance_portal",
    "postal_address",
    "website",
    "twitter",
    "facebook",
    "public_mobile",
  ],
  "sources.entity_type": [
    "jurisdiction",
    "body",
    "position",
    "person",
    "appointment",
    "contact",
    "topic",
    "responsibility",
  ],
  "collection_log.run_type": ["daily_collect", "weekly_update"],
  "collection_log.status": ["completed", "partial", "failed"],
};

const DATA_STATUS_TABLES = [
  "jurisdictions",
  "bodies",
  "positions",
  "persons",
  "appointments",
];
const DATA_STATUSES = ["pending", "collected", "verified", "stale"];
const CONFIDENCE_TABLES = [
  "jurisdictions",
  "bodies",
  "positions",
  "persons",
  "appointments",
  "contacts",
  "sources",
];

export class CsvDatasetValidationError extends Error {
  constructor(issues) {
    super(
      `CSV dataset validation failed with ${issues.length} issue(s):\n${issues
        .map((issue) => `- ${issue}`)
        .join("\n")}`
    );
    this.name = "CsvDatasetValidationError";
    this.issues = issues;
  }
}

export function loadCsvDocuments(dataDir = DEFAULT_DATA_DIR) {
  return Object.fromEntries(
    Object.keys(EXPECTED_HEADERS).map((table) => [
      table,
      readCsvDocument(path.join(dataDir, `${table}.csv`)),
    ])
  );
}

function indexIds(table, rows, issues) {
  const ids = new Set();
  for (const row of rows) {
    if (!Number.isInteger(row.id) || row.id <= 0) {
      issues.push(`${table}: invalid positive integer id ${String(row.id)}`);
    } else if (ids.has(row.id)) {
      issues.push(`${table}: duplicate id ${row.id}`);
    }
    ids.add(row.id);
  }
  return ids;
}

function checkReference({
  table,
  row,
  field,
  targetTable,
  targetIds,
  issues,
  optional = false,
}) {
  const value = row[field];
  if (value == null && optional) return;
  if (!targetIds.has(value)) {
    issues.push(
      `${table} ${row.id}: ${field} references missing ${targetTable} id ${String(value)}`
    );
  }
}

export function validateCsvDocuments(documents) {
  const issues = [];

  for (const [table, expectedHeaders] of Object.entries(EXPECTED_HEADERS)) {
    const document = documents[table];
    if (!document) {
      issues.push(`${table}: missing CSV document`);
      continue;
    }
    if (
      document.headers.length !== expectedHeaders.length ||
      document.headers.some((header, index) => header !== expectedHeaders[index])
    ) {
      issues.push(
        `${table}: headers must be exactly ${expectedHeaders.join(",")}`
      );
    }
  }

  if (issues.length > 0) throw new CsvDatasetValidationError(issues);

  const rows = Object.fromEntries(
    Object.entries(documents).map(([table, document]) => [table, document.rows])
  );
  const ids = Object.fromEntries(
    Object.entries(rows).map(([table, tableRows]) => [
      table,
      indexIds(table, tableRows, issues),
    ])
  );

  for (const [table, fields] of Object.entries(REQUIRED_VALUES)) {
    for (const row of rows[table]) {
      for (const field of fields) {
        if (row[field] == null || row[field] === "") {
          issues.push(`${table} ${row.id}: ${field} is required`);
        }
      }
    }
  }

  for (const [qualifiedField, allowedValues] of Object.entries(ENUMS)) {
    const [table, field] = qualifiedField.split(".");
    for (const row of rows[table]) {
      const value = row[field];
      if (value != null && !allowedValues.includes(value)) {
        issues.push(
          `${table} ${row.id}: ${field} has invalid value ${String(value)}`
        );
      }
    }
  }

  for (const table of DATA_STATUS_TABLES) {
    for (const row of rows[table]) {
      if (row.data_status != null && !DATA_STATUSES.includes(row.data_status)) {
        issues.push(
          `${table} ${row.id}: data_status has invalid value ${String(row.data_status)}`
        );
      }
    }
  }

  for (const table of CONFIDENCE_TABLES) {
    for (const row of rows[table]) {
      if (
        row.confidence != null &&
        (typeof row.confidence !== "number" ||
          row.confidence < 0 ||
          row.confidence > 1)
      ) {
        issues.push(
          `${table} ${row.id}: confidence must be a number from 0 to 1`
        );
      }
    }
  }

  for (const row of rows.jurisdictions) {
    checkReference({
      table: "jurisdictions",
      row,
      field: "parent_id",
      targetTable: "jurisdictions",
      targetIds: ids.jurisdictions,
      issues,
      optional: true,
    });
  }
  for (const row of rows.bodies) {
    checkReference({
      table: "bodies",
      row,
      field: "jurisdiction_id",
      targetTable: "jurisdictions",
      targetIds: ids.jurisdictions,
      issues,
    });
    checkReference({
      table: "bodies",
      row,
      field: "parent_body_id",
      targetTable: "bodies",
      targetIds: ids.bodies,
      issues,
      optional: true,
    });
  }
  for (const row of rows.positions) {
    checkReference({
      table: "positions",
      row,
      field: "jurisdiction_id",
      targetTable: "jurisdictions",
      targetIds: ids.jurisdictions,
      issues,
    });
    checkReference({
      table: "positions",
      row,
      field: "body_id",
      targetTable: "bodies",
      targetIds: ids.bodies,
      issues,
      optional: true,
    });
    checkReference({
      table: "positions",
      row,
      field: "reports_to_position_id",
      targetTable: "positions",
      targetIds: ids.positions,
      issues,
      optional: true,
    });
    if (typeof row.is_vacant !== "boolean") {
      issues.push(`positions ${row.id}: is_vacant must be true or false`);
    }
  }

  const currentAppointmentByPosition = new Map();
  for (const row of rows.appointments) {
    checkReference({
      table: "appointments",
      row,
      field: "person_id",
      targetTable: "persons",
      targetIds: ids.persons,
      issues,
    });
    checkReference({
      table: "appointments",
      row,
      field: "position_id",
      targetTable: "positions",
      targetIds: ids.positions,
      issues,
    });
    if (typeof row.is_current !== "boolean") {
      issues.push(`appointments ${row.id}: is_current must be true or false`);
    }
    if (row.is_current === true && row.end_date != null) {
      issues.push(`appointments ${row.id}: current appointment has an end_date`);
    }
    if (row.is_current === false && row.end_date == null) {
      issues.push(`appointments ${row.id}: historical appointment needs an end_date`);
    }
    if (row.is_current === true) {
      const existing = currentAppointmentByPosition.get(row.position_id);
      if (existing != null) {
        issues.push(
          `appointments ${row.id}: position ${row.position_id} already has current appointment ${existing}`
        );
      } else {
        currentAppointmentByPosition.set(row.position_id, row.id);
      }
    }
  }

  for (const row of rows.positions) {
    if (row.is_vacant === true && currentAppointmentByPosition.has(row.id)) {
      issues.push(
        `positions ${row.id}: marked vacant but has a current appointment`
      );
    }
  }

  for (const row of rows.contacts) {
    for (const [field, targetTable] of [
      ["position_id", "positions"],
      ["person_id", "persons"],
      ["body_id", "bodies"],
      ["jurisdiction_id", "jurisdictions"],
    ]) {
      checkReference({
        table: "contacts",
        row,
        field,
        targetTable,
        targetIds: ids[targetTable],
        issues,
        optional: true,
      });
    }
    if (
      row.position_id == null &&
      row.person_id == null &&
      row.body_id == null &&
      row.jurisdiction_id == null
    ) {
      issues.push(`contacts ${row.id}: contact has no owner`);
    }
    if (
      typeof row.is_public !== "boolean" ||
      typeof row.is_verified !== "boolean"
    ) {
      issues.push(
        `contacts ${row.id}: is_public and is_verified must be true or false`
      );
    }
  }

  for (const row of rows.topics) {
    checkReference({
      table: "topics",
      row,
      field: "parent_topic_id",
      targetTable: "topics",
      targetIds: ids.topics,
      issues,
      optional: true,
    });
  }

  for (const row of rows.responsibility_map) {
    checkReference({
      table: "responsibility_map",
      row,
      field: "topic_id",
      targetTable: "topics",
      targetIds: ids.topics,
      issues,
    });
    checkReference({
      table: "responsibility_map",
      row,
      field: "body_id",
      targetTable: "bodies",
      targetIds: ids.bodies,
      issues,
      optional: true,
    });
    checkReference({
      table: "responsibility_map",
      row,
      field: "position_id",
      targetTable: "positions",
      targetIds: ids.positions,
      issues,
      optional: true,
    });
    if (
      row.body_id == null &&
      row.position_id == null &&
      row.jurisdiction_level == null
    ) {
      issues.push(
        `responsibility_map ${row.id}: mapping needs a body, position, or jurisdiction level`
      );
    }
    if (!ENUMS["jurisdictions.level"].includes(row.jurisdiction_level)) {
      issues.push(
        `responsibility_map ${row.id}: invalid jurisdiction_level ${String(row.jurisdiction_level)}`
      );
    }
  }

  const entityTables = {
    jurisdiction: "jurisdictions",
    body: "bodies",
    position: "positions",
    person: "persons",
    appointment: "appointments",
    contact: "contacts",
    topic: "topics",
    responsibility: "responsibility_map",
  };
  for (const row of rows.sources) {
    const targetTable = entityTables[row.entity_type];
    if (targetTable && !ids[targetTable].has(row.entity_id)) {
      issues.push(
        `sources ${row.id}: entity_id references missing ${targetTable} id ${row.entity_id}`
      );
    }
  }

  if (issues.length > 0) throw new CsvDatasetValidationError(issues);

  return {
    tables: Object.keys(rows).length,
    records: Object.values(rows).reduce(
      (total, tableRows) => total + tableRows.length,
      0
    ),
    positions: rows.positions.length,
    currentAppointments: [...currentAppointmentByPosition.keys()].length,
    contacts: rows.contacts.length,
  };
}

export function validateCsvData(dataDir = DEFAULT_DATA_DIR) {
  return validateCsvDocuments(loadCsvDocuments(dataDir));
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const summary = validateCsvData();
  console.log(
    `Validated ${summary.records} records across ${summary.tables} CSV tables ` +
      `(${summary.positions} positions, ${summary.currentAppointments} current appointments, ` +
      `${summary.contacts} contacts).`
  );
}
