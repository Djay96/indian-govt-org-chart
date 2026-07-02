# Architecture

The Indian Government Org Chart is a static-first React application. Its source
of truth is a set of linked CSV files; no database is required at runtime. A
Netlify Function provides the only dynamic backend capability for grounded AI
questions.

```mermaid
flowchart TB
  subgraph Sources["Source of truth"]
    CSV["10 linked CSV tables<br/>jurisdictions · bodies · positions · persons<br/>appointments · contacts · topics<br/>responsibility map · sources · collection log"]
    Schema["PostgreSQL schema<br/>(optional database import)"]
    Runbooks["Collection runbooks<br/>and progress tracker"]
  end

  subgraph Build["Validation and build pipeline"]
    Parser["Strict CSV parser<br/>headers · quoted fields · typed values"]
    Validator["Schema-aware validator<br/>IDs · foreign keys · enums · confidence<br/>appointment state · contact ownership · routing"]
    Builder["Data builder<br/>joins and enriches linked records"]
    AppData["accountable-india.json<br/>browser dataset and search index"]
    AIData["ai-context.json<br/>3,215 grounding records"]
  end

  subgraph Browser["React browser application"]
    Router["React Router"]
    Pages["Dashboard · Explore · Geography<br/>Data Quality · Wiki · AI Agent"]
    DataClient["Dataset loader and in-memory cache"]
    Search["Fuse.js full-text search"]
    Charts["Recharts visualizations"]
    Wiki["Markdown wiki compiler"]
  end

  subgraph ChatBackend["Netlify chat function"]
    Endpoint["POST /api/chat"]
    Guard["Method, role, length,<br/>and payload validation"]
    ContextCache["Cached AI grounding index"]
    Retrieval["Question-specific retrieval<br/>aliases · token scoring · relevance cutoff"]
    Prompt["Evidence-first system prompt<br/>with retrieved records"]
    DeepSeek["DeepSeek Chat API"]
  end

  subgraph Delivery["Netlify delivery"]
    Vite["Vite production build"]
    Dist["Static dist/ output"]
    CDN["Netlify CDN<br/>SPA fallback and security headers"]
  end

  CSV --> Parser --> Validator
  Validator -->|"validation passes"| Builder
  Validator -->|"validation fails"| Stop["Build stops with actionable errors"]
  Builder --> AppData
  Builder --> AIData
  CSV -.->|import-ready| Schema
  Runbooks --> CSV

  AppData --> DataClient
  DataClient --> Search
  DataClient --> Pages
  Router --> Pages
  Search --> Pages
  Charts --> Pages
  Wiki --> Pages

  Pages -->|chat messages| Endpoint
  Endpoint --> Guard --> ContextCache
  AIData --> ContextCache
  ContextCache --> Retrieval --> Prompt
  Prompt --> DeepSeek
  DeepSeek -->|grounded answer| Endpoint

  Validator --> Vite
  Builder --> Vite
  Browser --> Vite
  ChatBackend --> Vite
  Vite --> Dist --> CDN
  CDN -->|static application| Browser
  CDN -->|/api/chat| Endpoint
```

## Runtime boundaries

| Boundary | Responsibility |
|---|---|
| CSV dataset | Canonical government entities, relationships, contacts, provenance, and collection history |
| Build pipeline | Reject malformed or inconsistent data, enrich relationships, and generate optimized runtime artifacts |
| Browser | Load the static dataset once, search locally, render dashboards, and display documentation |
| Netlify Function | Validate chat requests, retrieve relevant dataset evidence, and call DeepSeek without exposing the API key |
| DeepSeek | Generate a response from the system instructions and retrieved records; it does not receive the complete raw dataset |
| PostgreSQL schema | Optional deployment target for consumers that need a queryable database; it is not used by the hosted application |

## Data flow

1. Contributors update the linked files in `Accountable India/data/`.
2. `npm run validate:data` verifies file structure, constraints, and relationships.
3. `scripts/build-data.mjs` joins the tables and generates:
   - `accountable-india.json` for dashboards and Fuse.js search.
   - `ai-context.json` for server-side question-specific retrieval.
4. Vite builds the React application, and Netlify publishes the static output
   together with the `/api/chat` function.
5. Chat requests retrieve only the most relevant records before contacting
   DeepSeek, keeping prompts bounded and reducing unsupported answers.

## Quality gates

The production build runs CSV validation automatically. The repository also
provides:

- `npm run typecheck`
- `npm test`
- `npm run test:chat:coverage`
- `npm run build`

The chat core is covered across successful responses, missing configuration,
input rejection, grounding retrieval, upstream failures, and malformed requests.
