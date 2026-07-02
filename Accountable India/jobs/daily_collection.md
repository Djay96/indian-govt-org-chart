# Daily Collection Job — Runbook

This is the procedure the **daily scheduled task** runs. It is self-contained:
each run starts fresh, reads where the last run stopped, collects the next batch,
and records progress. Goal: keep going day after day until every government office
in India (Union → State/UT → District → Local) is mapped.

## Files (folder: "Accountable India")
- `jobs/progress.md` — the resume pointer + phase checklist (READ FIRST, UPDATE LAST)
- `data/*.csv` — the dataset (APPEND new rows here)
- `data/collection_log.csv` — one row appended per run

## Steps each run

1. **Read `jobs/progress.md`** — find the `## NEXT TARGET` block. That is today's batch.

2. **Read the relevant CSVs** to learn the current max `id` in each table and to
   avoid duplicates (match on name + jurisdiction/body before adding).

3. **Research the batch** using web search and ONLY authoritative sources, in
   this priority order:
   - Official government sites (`*.gov.in`, `*.nic.in`), e.g. india.gov.in
     "Who's Who", pmindia.gov.in, ministry sites, state portals, district NIC sites.
     NOTE: many of these are JavaScript-rendered and a plain web fetch returns an
     empty shell. When that happens, use the Claude-in-Chrome browser tools
     (navigate + read page) to load and read the real page before extracting.
   - State Election Commission / ECI for elected reps.
   - Local Government Directory (lgdirectory.gov.in) for jurisdiction/LGD codes.
   - Wikipedia / reputable news ONLY to cross-check, never as the sole source.

4. **Add rows** to the CSVs following the schema. For every record set:
   - `source_url` = the page you took it from
   - `last_verified_at` = today's date (YYYY-MM-DD)
   - `confidence` = 0.85+ if from an official .gov.in/.nic.in page, 0.6 if news/wiki only
   - `data_status` = `verified` (official source) / `collected` (single decent source)
     / `pending` (needs confirmation)
   - Keep referential integrity: a position's `body_id`/`jurisdiction_id` and an
     appointment's `person_id`/`position_id` must point to ids that already exist.
   - Build the org chart: set `positions.reports_to_position_id` to the senior office.

5. **Contacts — OFFICIAL / PUBLIC ONLY.** Collect office email, office phone,
   grievance portal, postal address, official website, and official social handles
   that are PUBLISHED on government pages. **Do NOT collect personal/private mobile
   numbers or personal emails.** Set `is_public=true`, `is_verified=true` only when
   taken directly from an official page, and always record `source_url`.

6. **Batch size:** aim for ~20–40 well-sourced records per run. Quality over speed.
   If a source is unreachable or ambiguous, mark the record `pending` and move on.

7. **Update `jobs/progress.md`:** tick completed checklist items and rewrite the
   `## NEXT TARGET` block to point at the next batch (continue the phase order).

8. **Append a row to `data/collection_log.csv`** with run_type `daily_collect`,
   the scope covered, counts (added/updated/flagged), status, and `next_target`.

9. **Stop condition:** if every Phase 1–6 item is ticked and no `pending`/`stale`
   records remain, write "DATASET COMPLETE" at the top of `progress.md` and note it
   in the log. (The weekly update job then keeps everything current.)

## Quality rules
- Never invent emails, phone numbers, names, or dates. If unknown, leave blank and
  mark `pending`.
- Prefer attaching contacts to the POSITION (survives staff changes) over the person.
- One person can hold multiple positions (additional charge) — that's multiple
  appointment rows, not duplicate persons.
