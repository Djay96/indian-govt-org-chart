# Topics and Responsibility

When a citizen says *"there's no water in my colony"*, the app must map that plain-language problem to the **correct government office**. This is what `topics` and `responsibility_map` do.

## Topics = problem categories

Each topic represents a class of citizen grievance:

| Topic | Keywords |
|-------|----------|
| Water Supply | water, tap, pipeline, leakage, tanker |
| Roads & Infrastructure | road, pothole, bridge, highway |
| Electricity | power, outage, transformer, billing |
| Police & Law Order | police, FIR, crime, harassment |
| Sanitation | garbage, drain, sewage, toilet |

Topics can nest (`parent_topic_id`) for subcategories. The `keywords` field (comma-separated) powers text matching.

## Responsibility map = who owns what

The `responsibility_map` table links topics to offices:

```
topic: Water Supply
position: Executive Engineer (Water), Municipal Corporation
jurisdiction_level: municipal_corporation
priority: 1 (primary owner)
```

| Field | Meaning |
|-------|---------|
| `priority` | 1 = first contact, 2 = escalation |
| `jurisdiction_level` | Which admin level typically handles it |
| `body_id` / `position_id` | The responsible entity |

## Escalation logic

Most citizen problems follow a pattern:

1. **Local first** — ward officer, municipal engineer
2. **District** — DM, district-level department head
3. **State** — Secretary, Minister
4. **Union** — for subjects on the Union List (defence, railways, etc.)

The responsibility map encodes this as priority levels. The app's AI agent uses this context when advising citizens.

## Example flow

> Problem: "No streetlights on MG Road, Pune"
> 
> 1. Match keywords → **Electricity** topic
> 2. Lookup responsibility → Municipal Electrical Dept (priority 1)
> 3. Find position → Executive Engineer, PMC
> 4. Get contact → official email / grievance portal
> 5. Escalation → Municipal Commissioner → DM → Divisional Commissioner

## Related

- [[Data Model]] — table structure
- [[Jurisdictions]] — jurisdiction_level in responsibility map
- [[Contacts]] — reaching the responsible office
