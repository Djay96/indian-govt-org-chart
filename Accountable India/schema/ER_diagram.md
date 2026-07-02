# Accountable India — Entity Relationship Diagram

This diagram shows how the tables connect. Open it in any Markdown viewer that
renders Mermaid (GitHub, VS Code with Mermaid plugin, etc.).

```mermaid
erDiagram
    JURISDICTIONS ||--o{ JURISDICTIONS : "parent_id (tree)"
    JURISDICTIONS ||--o{ BODIES : "has"
    JURISDICTIONS ||--o{ POSITIONS : "has"

    BODIES ||--o{ BODIES : "parent_body_id (tree)"
    BODIES ||--o{ POSITIONS : "has"

    POSITIONS ||--o{ POSITIONS : "reports_to_position_id (org chart)"
    POSITIONS ||--o{ APPOINTMENTS : "filled by"
    PERSONS   ||--o{ APPOINTMENTS : "serves in"

    POSITIONS ||--o{ CONTACTS : "reachable via"
    PERSONS   ||--o{ CONTACTS : "reachable via"
    BODIES    ||--o{ CONTACTS : "reachable via"

    TOPICS ||--o{ TOPICS : "parent_topic_id (tree)"
    TOPICS ||--o{ RESPONSIBILITY_MAP : "mapped to"
    BODIES ||--o{ RESPONSIBILITY_MAP : "owns"
    POSITIONS ||--o{ RESPONSIBILITY_MAP : "owns"

    JURISDICTIONS {
        bigint id PK
        text   name
        text   level
        bigint parent_id FK
        text   state_code
        text   lgd_code
    }
    BODIES {
        bigint id PK
        bigint jurisdiction_id FK
        bigint parent_body_id FK
        text   name
        text   body_type
    }
    POSITIONS {
        bigint id PK
        bigint body_id FK
        bigint jurisdiction_id FK
        bigint reports_to_position_id FK
        text   title
        text   position_type
    }
    PERSONS {
        bigint id PK
        text   full_name
        text   party
        date   date_of_birth
    }
    APPOINTMENTS {
        bigint id PK
        bigint person_id FK
        bigint position_id FK
        date   start_date
        boolean is_current
    }
    CONTACTS {
        bigint id PK
        bigint position_id FK
        bigint person_id FK
        bigint body_id FK
        text   contact_type
        text   value
    }
    TOPICS {
        bigint id PK
        text   name
        text   keywords
    }
    RESPONSIBILITY_MAP {
        bigint id PK
        bigint topic_id FK
        bigint body_id FK
        bigint position_id FK
        text   jurisdiction_level
    }
    SOURCES {
        bigint id PK
        text   entity_type
        bigint entity_id
        text   source_url
    }
    COLLECTION_LOG {
        bigint id PK
        date   run_date
        text   run_type
        text   next_target
    }
```

## How the app uses this

1. Citizen describes a problem in plain language.
2. App's AI matches the text against `topics.keywords`.
3. `responsibility_map` resolves the topic + citizen's location/jurisdiction
   level to the owning `bodies` / `positions`.
4. `appointments` (where `is_current = true`) → the actual `persons` in office.
5. `positions.reports_to_position_id` walks UP the chain of command.
6. `contacts` provides the official email/phone for every link in that chain,
   so the app can email the whole escalation ladder at once.
