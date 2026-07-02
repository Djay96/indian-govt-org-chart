# Methodology

Accountable India data is collected and maintained through **automated jobs** with human-verifiable provenance. Every record carries `source_url`, `confidence`, `data_status`, and `last_verified_at`.

## Data status lifecycle

```
pending → collected → verified → (stale if outdated)
```

| Status | Meaning |
|--------|---------|
| `pending` | Identified but not yet collected |
| `collected` | Data gathered from a source, not yet double-checked |
| `verified` | Confirmed against official source |
| `stale` | Was verified but may be outdated (trigger re-check) |

## Confidence scores

Each record has a `confidence` score from 0.00 to 1.00:

- **0.90+** — Official government website, gazette notification
- **0.70–0.89** — Reputable news source, Wikipedia with citation
- **0.50–0.69** — Secondary source, needs verification
- **<0.50** | Low confidence, flagged for review

## Collection jobs

Two automated runbooks in `Accountable India/jobs/`:

### Daily collection
- Adds the next batch of offices/people
- Works top-down: Union → States → Districts → Local
- Advances progress pointer in `jobs/progress.md`

### Weekly update
- Re-verifies existing records
- Updates changed appointments (new ministers, transfers)
- Preserves history via appointments table

Each run logs to `collection_log.csv` with records added/updated/flagged.

## Source citations

The `sources` table tracks provenance:

```
entity_type: position
entity_id: 42
source_url: https://www.india.gov.in/...
retrieved_at: 2026-06-26
confidence: 0.90
```

**Contributing corrections:** Open a pull request with the corrected data AND a source URL. We merge verified corrections only.

## Privacy & ethics

- Official/public contacts only (see [[Contacts]])
- No scraping of personal information
- Data licensed under ODC-By (attribution required)

## Related

- [[Data Model]] — schema design
- [[Metrics]] — verification rates on dashboard
- [[index|Home]] — project overview
