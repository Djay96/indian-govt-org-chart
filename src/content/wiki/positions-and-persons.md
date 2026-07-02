# Positions & Persons

## Positions (offices)

A **position** is an office or designation — e.g. "District Magistrate, Lucknow" or "Secretary, Ministry of Finance". Positions are org-chart nodes, not people.

Key fields:

- `title` — office name
- `position_type` — e.g. `district_magistrate`, `secretary`, `minister`
- `reports_to_position_id` — senior office in the chain
- `rank_level` — hierarchy depth (lower = more senior)
- `is_vacant` — whether the office currently has no appointee

## Persons

A **person** record holds biographical data: `full_name`, `honorific`, `party`, etc. Persons are linked to positions through **appointments**.

## Appointments

The `appointments` table records who held which office and when:

- `is_current = true` → present holder
- Historical rows are kept when officials transfer or retire

This separation lets the app show both **who is responsible now** and **who was responsible before**.

Back to [[index]] · See [[data-model]]
