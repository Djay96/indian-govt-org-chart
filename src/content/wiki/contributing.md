# Contributing

## Dataset corrections

Pull requests with **verified corrections and source citations** are welcome. Edit CSVs in `Accountable India/data/` and include a row in `sources.csv` pointing to your reference.

## Automated collection

The dataset is maintained via scheduled jobs documented in `Accountable India/jobs/`:

- **Daily** (`daily_collection.md`) — adds the next batch of offices top-down
- **Weekly** (`weekly_update.md`) — re-verifies existing records

See `Accountable India/jobs/progress.md` for current phase status.

## Running locally

```bash
git clone https://github.com/Djay96/indian-govt-org-chart.git
cd indian-govt-org-chart
npm install
cp .env.example .env   # add DEEPSEEK_API_KEY for AI agent
npm run netlify:dev    # Vite + Netlify functions
```

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DEEPSEEK_API_KEY` | Netlify dashboard + local `.env` | Powers the AI chat agent |

Never commit `.env` or API keys to git.

Back to [[index]] · See [[data-model]]
