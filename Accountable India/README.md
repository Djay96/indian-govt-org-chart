# Accountable India

A growing, connected dataset of **every government office in India** — Union,
State/UT, District, and Local — modelled as an org chart, so an app can take a
citizen's problem in plain language and surface **who is responsible** and **how
to reach the entire chain of command**.

## What's in here

```
Accountable India/
├── README.md                  ← you are here
├── schema/
│   ├── schema.sql             ← PostgreSQL schema (Supabase-ready), 10 linked tables + a view
│   └── ER_diagram.md          ← Mermaid ER diagram + how the app uses the data
├── data/                      ← the dataset as CSVs (one file per table)
│   ├── jurisdictions.csv      ← the geographic/admin tree (Union → … → ward)
│   ├── bodies.csv             ← ministries, departments, agencies, local bodies
│   ├── positions.csv          ← the OFFICES / designations (the org-chart nodes)
│   ├── persons.csv            ← the actual people
│   ├── appointments.csv       ← who holds which office, over time
│   ├── contacts.csv           ← OFFICIAL/PUBLIC emails, phones, portals, sites
│   ├── topics.csv             ← citizen problem categories + matching keywords
│   ├── responsibility_map.csv ← which office owns which topic at which level
│   ├── sources.csv            ← provenance / citations
│   └── collection_log.csv     ← one row per job run
└── jobs/
    ├── daily_collection.md    ← runbook for the daily "add more" job
    ├── weekly_update.md       ← runbook for the weekly "keep current" job
    └── progress.md            ← resume pointer + phase checklist
```

## The data model (how tables connect)

The key idea: **an OFFICE is separate from the PERSON in it.**

- `positions` = the office (e.g. "Minister of Finance"). The org chart is built
  with `positions.reports_to_position_id` (each office points to its senior office).
- `persons` = real people. `appointments` link a person to a position with dates
  (`is_current = true` is who holds it now). This keeps full history when people move.
- `jurisdictions` is a tree (`parent_id`): Union → State → District → Local body.
- `bodies` (ministries/departments) belong to a jurisdiction and can nest.
- `contacts` attach to a position (preferred), person, body, or jurisdiction — and
  are **official/public channels only**.
- `topics` + `responsibility_map` power the app's "problem → responsible office".

See `schema/ER_diagram.md` for the diagram.

## The two automated jobs

- **Daily** (`accountable-india-daily-collect`, 9 AM) — adds the next batch of
  offices/people, working top-down (Union → States → Districts → Local), and
  advances `jobs/progress.md`. Runs every day until the dataset is complete.
- **Weekly** (`accountable-india-weekly-update`, Monday 8 AM) — re-verifies
  existing records and updates anything that changed (new ministers, new contacts),
  preserving history.

Manage or pause them in the **Scheduled** section of the sidebar.
> Tip: open each task once and click **Run now** to pre-approve web search/file
> tools, so future automatic runs don't pause on permission prompts.

## A note on contacts & privacy

The jobs collect only **published, official, public** contact channels (office
emails, office phone numbers, grievance portals like CPGRAMS, official websites
and social handles). They do **not** collect personal/private mobile numbers or
personal emails of officials — that protects you legally and ethically when the
app lets citizens email the chain of command.

## Pushing to a database (Supabase or any PostgreSQL)

1. Create a project / database.
2. Run the schema:
   ```sql
   -- in the Supabase SQL editor, paste the contents of schema/schema.sql
   ```
3. Import the CSVs **in this order** (respects foreign keys):
   `jurisdictions → bodies → positions → persons → appointments → contacts →
   topics → responsibility_map → sources → collection_log`
   - Supabase: Table editor → each table → **Import data from CSV**.
   - psql: `\copy jurisdictions FROM 'data/jurisdictions.csv' CSV HEADER;` (repeat per table).
4. After importing seed rows that carry explicit ids, reset each id sequence so
   new inserts don't collide (snippet is at the top of `schema/schema.sql`).

## Current status (seed)

Bootstrapped with the Union top: President (Droupadi Murmu), Vice President
(C. P. Radhakrishnan), Prime Minister (Narendra Modi), and key Cabinet Ministers,
plus 8 ministries, a starter topic/responsibility map, and public contact channels.
A few records are intentionally marked `pending`/lower-confidence for the jobs to
verify (e.g. the current Finance Minister). The daily job continues from
`jobs/progress.md`.
