import test from "node:test";
import assert from "node:assert/strict";

import {
  CsvDatasetValidationError,
  EXPECTED_HEADERS,
  loadCsvDocuments,
  validateCsvDocuments,
} from "../scripts/validate-csv-data.mjs";
import { parseCsvDocument } from "../scripts/csv-utils.mjs";

function row(table, values) {
  return {
    ...Object.fromEntries(EXPECTED_HEADERS[table].map((header) => [header, null])),
    ...values,
  };
}

function validDocuments() {
  const rows = {
    jurisdictions: [
      row("jurisdictions", {
        id: 1,
        name: "India",
        level: "union",
        confidence: 0.9,
        data_status: "verified",
      }),
    ],
    bodies: [
      row("bodies", {
        id: 1,
        jurisdiction_id: 1,
        name: "Test Ministry",
        body_type: "ministry",
        confidence: 0.8,
        data_status: "verified",
      }),
    ],
    positions: [
      row("positions", {
        id: 1,
        body_id: 1,
        jurisdiction_id: 1,
        title: "Test Secretary",
        position_type: "bureaucratic",
        branch: "administrative",
        is_vacant: false,
        confidence: 0.8,
        data_status: "verified",
      }),
    ],
    persons: [
      row("persons", {
        id: 1,
        full_name: "Test Official",
        confidence: 0.8,
        data_status: "verified",
      }),
    ],
    appointments: [
      row("appointments", {
        id: 1,
        person_id: 1,
        position_id: 1,
        is_current: true,
        appointment_type: "appointed",
        confidence: 0.8,
        data_status: "verified",
      }),
    ],
    contacts: [
      row("contacts", {
        id: 1,
        position_id: 1,
        contact_type: "office_email",
        value: "office@example.gov.in",
        is_public: true,
        is_verified: true,
        confidence: 0.8,
      }),
    ],
    topics: [
      row("topics", {
        id: 1,
        name: "Roads",
        keywords: "road,pothole",
      }),
    ],
    responsibility_map: [
      row("responsibility_map", {
        id: 1,
        topic_id: 1,
        body_id: 1,
        jurisdiction_level: "union",
        priority: 1,
      }),
    ],
    sources: [
      row("sources", {
        id: 1,
        entity_type: "position",
        entity_id: 1,
        source_url: "https://example.gov.in",
        confidence: 0.8,
      }),
    ],
    collection_log: [
      row("collection_log", {
        id: 1,
        run_date: "2026-07-02",
        run_type: "daily_collect",
        status: "completed",
      }),
    ],
  };

  return Object.fromEntries(
    Object.entries(EXPECTED_HEADERS).map(([table, headers]) => [
      table,
      { source: `${table}.csv`, headers: [...headers], rows: rows[table] },
    ])
  );
}

function expectValidationIssue(documents, pattern) {
  assert.throws(
    () => validateCsvDocuments(documents),
    (error) =>
      error instanceof CsvDatasetValidationError && pattern.test(error.message)
  );
}

test("CSV parser handles quoted commas, escaped quotes, types, and CRLF", () => {
  const document = parseCsvDocument(
    'id,name,active,score,optional\r\n1,"Office, Central",true,0.85,\r\n2,"A ""quoted"" name",false,4,NULL\r\n',
    "fixture.csv"
  );

  assert.deepEqual(document.headers, [
    "id",
    "name",
    "active",
    "score",
    "optional",
  ]);
  assert.deepEqual(document.rows, [
    {
      id: 1,
      name: "Office, Central",
      active: true,
      score: 0.85,
      optional: null,
    },
    {
      id: 2,
      name: 'A "quoted" name',
      active: false,
      score: 4,
      optional: null,
    },
  ]);
});

test("CSV parser rejects malformed documents", () => {
  assert.throws(() => parseCsvDocument("", "empty.csv"), /CSV is empty/);
  assert.throws(
    () => parseCsvDocument('id,name\n1,"broken', "quotes.csv"),
    /unterminated quoted field/
  );
  assert.throws(
    () => parseCsvDocument("id,id\n1,2", "headers.csv"),
    /duplicate header/
  );
  assert.throws(
    () => parseCsvDocument("id,name\n1", "columns.csv"),
    /has 1 columns; expected 2/
  );
});

test("validates a complete linked CSV dataset", () => {
  const summary = validateCsvDocuments(validDocuments());
  assert.deepEqual(summary, {
    tables: 10,
    records: 10,
    positions: 1,
    currentAppointments: 1,
    contacts: 1,
  });
});

test("the shipped Accountable India CSV dataset passes validation", () => {
  const summary = validateCsvDocuments(loadCsvDocuments());
  assert.equal(summary.tables, 10);
  assert.equal(summary.positions, 2905);
  assert.equal(summary.currentAppointments, 2545);
  assert.equal(summary.contacts, 3089);
});

test("rejects missing documents and header drift", () => {
  const missing = validDocuments();
  delete missing.contacts;
  expectValidationIssue(missing, /contacts: missing CSV document/);

  const changed = validDocuments();
  changed.positions.headers = ["id", "unexpected"];
  expectValidationIssue(changed, /positions: headers must be exactly/);
});

test("rejects duplicate IDs, invalid enums, and out-of-range confidence", () => {
  const documents = validDocuments();
  documents.persons.rows.push({ ...documents.persons.rows[0] });
  documents.positions.rows[0].branch = "invalid_branch";
  documents.contacts.rows[0].confidence = 1.5;

  expectValidationIssue(documents, /persons: duplicate id 1/);
  expectValidationIssue(documents, /branch has invalid value invalid_branch/);
  expectValidationIssue(documents, /confidence must be a number from 0 to 1/);
});

test("rejects broken foreign keys and polymorphic source references", () => {
  const documents = validDocuments();
  documents.positions.rows[0].body_id = 999;
  documents.sources.rows[0].entity_id = 999;

  expectValidationIssue(documents, /references missing bodies id 999/);
  expectValidationIssue(
    documents,
    /entity_id references missing positions id 999/
  );
});

test("rejects conflicting appointment and vacancy state", () => {
  const documents = validDocuments();
  documents.persons.rows.push(
    row("persons", {
      id: 2,
      full_name: "Second Official",
      data_status: "verified",
    })
  );
  documents.appointments.rows.push(
    row("appointments", {
      id: 2,
      person_id: 2,
      position_id: 1,
      is_current: true,
      appointment_type: "appointed",
      data_status: "verified",
    })
  );
  documents.positions.rows[0].is_vacant = true;

  expectValidationIssue(
    documents,
    /position 1 already has current appointment 1/
  );
  expectValidationIssue(
    documents,
    /marked vacant but has a current appointment/
  );
});

test("rejects invalid appointment dates, ownerless contacts, and empty routing", () => {
  const documents = validDocuments();
  documents.appointments.rows[0].end_date = "2026-07-01";
  documents.contacts.rows[0].position_id = null;
  documents.responsibility_map.rows[0].body_id = null;
  documents.responsibility_map.rows[0].jurisdiction_level = null;

  expectValidationIssue(documents, /current appointment has an end_date/);
  expectValidationIssue(documents, /contact has no owner/);
  expectValidationIssue(
    documents,
    /mapping needs a body, position, or jurisdiction level/
  );
});
