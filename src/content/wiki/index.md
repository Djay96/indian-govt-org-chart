# Indian Government Org Chart

Open-source dashboards, search, and an AI agent built on the **Accountable India** dataset — a connected org chart of government offices across Union, State/UT, District, and Local levels.

## What this app does

- **Dashboard** — coverage metrics, charts, and quick navigation
- **Explore** — full-text search across offices, people, jurisdictions, and topics
- **Geography** — state and district breakdowns with DM coverage
- **Data Quality** — verification status, confidence scores, collection audit trail
- **AI Agent** — natural-language Q&A grounded in the dataset (DeepSeek via Netlify function)
- **Wiki** — documentation for the data model and contribution workflow

## The dataset

All live data comes from CSV files in `Accountable India/data/`, compiled at build time into `public/data/accountable-india.json`. See [[data-model]] for how tables connect.

Key principle: an **office** (position) is separate from the **person** who holds it. Appointments preserve history when officials change.

## Related projects

| Project | Description |
|---------|-------------|
| **Accountable India** (this repo) | National org-chart dataset + exploration app |
| **[Kisko Bolun UP](https://kisko-bolun-up.netlify.app)** | UP citizen complaint → responsible officer (separate app) |

## License

Data: [ODC-By](https://opendatacommons.org/licenses/by/) · Code: MIT

Official/public contact channels only — no personal mobile numbers or private emails.
