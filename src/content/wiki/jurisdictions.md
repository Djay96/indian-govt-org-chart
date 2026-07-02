# Jurisdictions

Jurisdictions form a **tree** via `parent_id`, representing India's administrative hierarchy:

```
Union → State/UT → District → Local body → Ward (where applicable)
```

## Fields

- `level` — e.g. `union`, `state`, `district`, `municipal`, `ward`
- `state_code` — ISO-style code for states/UTs
- `region` — geographic region (North, South, etc.)
- `data_status` — `verified`, `collected`, `pending`, or `stale`
- `confidence` — 0–1 score for data quality

## In the app

The **Geography** page lets you browse states/UTs, see DM coverage, and drill into positions within a state. The dashboard shows jurisdiction counts by level.

Back to [[index]] · See also [[data-model]]
