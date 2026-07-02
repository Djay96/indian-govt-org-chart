# Data Model

The Accountable India dataset uses **10 linked CSV tables** (PostgreSQL schema in `Accountable India/schema/schema.sql`).

## Core entities

| Table | Purpose |
|-------|---------|
| `jurisdictions` | Geographic/admin tree: Union → State → District → Local |
| `bodies` | Ministries, departments, agencies, municipal bodies |
| `positions` | Offices/designations — the org-chart nodes |
| `persons` | Real people |
| `appointments` | Who holds which office, with dates and history |
| `contacts` | Official/public emails, phones, portals |
| `topics` | Citizen problem categories |
| `responsibility_map` | Which office owns which topic at which level |
| `sources` | Provenance and citations |
| `collection_log` | Audit trail of automated collection runs |

## How they connect

- `positions.reports_to_position_id` builds the **org chart** (each office points to its senior).
- `jurisdictions.parent_id` builds the **geographic tree**.
- `appointments` links `persons` ↔ `positions` with `is_current` for the present holder.
- `contacts` attach to positions, persons, bodies, or jurisdictions — **official channels only**.
- `topics` + `responsibility_map` power **problem → responsible office** routing.

See [[jurisdictions]], [[positions-and-persons]], [[contacts]], and [[topics]] for detail.

## Build pipeline

At `npm run build`, `scripts/build-data.mjs` reads the CSVs and outputs:

- `public/data/accountable-india.json` — full queryable dataset + search index
- `public/data/ai-context.json` — condensed summary for the AI agent
