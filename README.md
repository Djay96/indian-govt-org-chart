# Indian Government Org Chart — Open Accountability Data

Two projects to make government accountable to citizens:

| Project | Scope | Status |
|---------|-------|--------|
| **[Accountable India](Accountable%20India/)** | National dataset: every government office in India as an org chart | 782/785 DMs named, 35/36 Union Secretaries, all states |
| **[Kisko Bolun UP](https://kisko-bolun-up.netlify.app)** | Live app: UP citizen complaint → responsible officer | Deployed on Netlify |

---

## Accountable India

A comprehensive, connected dataset of **every government office in India** — Union, State/UT, District, and Local — modelled as an org chart. Takes a citizen's problem in plain language and surfaces **who is responsible** and **how to reach the entire chain of command**.

### Dataset coverage (as of July 2026)

| Level | Coverage |
|-------|----------|
| Union Council of Ministers | 73 ministers + President/VP |
| Union bureaucracy (Secretaries) | 35/36 ministries |
| State Governors + Chief Ministers | All 31 states/UTs |
| State cabinets | All assembly states/UTs |
| Chief Secretaries | All 36 states/UTs |
| District Collectors/DMs | **782/785 (99.6%)** |
| Superintendents of Police | **764/786 (97.2%)** |
| Municipal Corporations | 238 corporations with Mayor + Commissioner offices |

### Data model

10 linked CSV tables with a PostgreSQL schema:
- **jurisdictions** — Union → State → District → Local tree
- **bodies** — ministries, departments, agencies
- **positions** — offices/designations (org-chart nodes)
- **persons** — actual people
- **appointments** — who holds which office, over time (preserves history)
- **contacts** — official/public emails, phones, portals
- **topics** — citizen problem categories
- **responsibility_map** — which office owns which topic
- **sources** — provenance/citations for every record
- **collection_log** — audit trail of data collection runs

See [`Accountable India/`](Accountable%20India/) for the full dataset, schema, and ER diagram.

---

## Kisko Bolun UP

A civic accountability tool for Uttar Pradesh. Describe a public issue and its location; the app maps it to the responsible department, shows the escalation chain, and drafts a complaint email.

**Live:** https://kisko-bolun-up.netlify.app

---

## License

Data: [Open Data Commons Attribution License (ODC-By)](https://opendatacommons.org/licenses/by/)  
Code: MIT

All contacts in this dataset are **official/public channels only** — no personal mobile numbers or private emails.

## Contributing

The Accountable India dataset is maintained via automated daily/weekly collection jobs. See `Accountable India/jobs/` for the runbooks. Pull requests with verified corrections (with source citations) are welcome.
