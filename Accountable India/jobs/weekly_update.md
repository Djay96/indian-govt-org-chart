# Weekly Update Job — Runbook

This is the procedure the **weekly scheduled task** runs. Its purpose is to keep
the EXISTING dataset accurate (people change offices, contacts change, new
appointments happen), separate from the daily job which mainly ADDS new records.

## Files (folder: "Accountable India")
- `data/*.csv` — the dataset (UPDATE existing rows)
- `data/collection_log.csv` — append one row per run (run_type `weekly_update`)

## Steps each run

1. **Pick the re-verification set**, in this priority order:
   - All rows with `data_status = 'pending'` (unconfirmed) — confirm or correct.
   - Rows where `last_verified_at` is older than 30 days (most stale first).
   - High-importance offices first (President, VP, PM, Governors, CMs, Cabinet
     Ministers, Chief Secretaries) regardless of age — these change visibly.

2. **Re-check each against official sources** (same source priority as the daily job).

3. **Apply changes:**
   - If an office holder CHANGED: set the old appointment `is_current=false` and
     `end_date` = the date it ended; add a NEW appointment row for the new person
     (add the person to `persons.csv` if new). Do not delete history.
   - If a contact changed: update the value, refresh `source_url` and
     `last_verified_at`.
   - If still correct: just bump `last_verified_at` to today and set
     `data_status='verified'`.
   - Mark anything you could not confirm this week as `data_status='stale'`.

4. **Append a row to `data/collection_log.csv`** with counts of updated/flagged
   records and a note on any office changes detected.

5. **Cadence:** runs weekly. Keep each run bounded (~50–100 record checks) so it
   finishes; the next week continues with the oldest remaining records.

## Quality rules
- Same as the daily job: official sources, public contacts only, never fabricate,
  preserve appointment history rather than overwriting it.
