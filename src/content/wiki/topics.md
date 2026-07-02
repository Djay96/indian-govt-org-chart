# Topics & Responsibility

## Topics

`topics.csv` defines citizen problem categories — e.g. roads, water supply, sanitation, law & order. Each topic has:

- `name` — display label
- `keywords` — comma-separated terms for matching plain-language complaints
- `description` — optional explanation

## Responsibility map

`responsibility_map.csv` links topics to the **office or body** responsible at a given administrative level. This powers:

- Escalation chains (local → district → state → union)
- The AI agent's ability to answer "who handles X?"
- Future citizen-facing complaint routing apps

## Example flow

A citizen reports a pothole in a district:

1. Match keywords → **Roads & Infrastructure** topic
2. Look up `responsibility_map` at district level → DM / municipal engineer
3. Walk `reports_to_position_id` for the escalation chain
4. Attach official contacts from the `contacts` table

Back to [[index]] · See [[data-model]] · See [[contributing]]
