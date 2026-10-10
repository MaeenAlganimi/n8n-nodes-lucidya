# Barq

Barq (برق) is an open-source tracker for scheduled and unscheduled power cuts. It shows which neighbourhoods are out, how many hours they have lost, and the chance the power is out in each of the next 24 hours.

People living with load-shedding need a shared picture of their own street: whether the cut has started, whether others are seeing it too, and whether the next hour looks like the usual evening block or like something else. A utility schedule, when one exists, often does not match what the street actually gets.

The demo ships with synthetic history for neighbourhoods in Tripoli, Beirut, Lagos, Karachi, Johannesburg, Cape Town, Baghdad, and Sana'a. The places are real. The outage times are not reports from them, and the site says so.

![Map of current outages beside the neighbourhood list](docs/screenshots/dashboard-en.png)

![24-hour outage forecast for Tajura, with the factors behind one hour](docs/screenshots/prediction-tajura.png)

## What it does

- **Reports.** Anyone can say the power is off, or that it is back, on the web form or in Telegram. Two different people reporting the same neighbourhood within 60 minutes confirm the change. One person cannot confirm themselves. The same report inside 30 minutes is a duplicate, reports closer than 2 minutes are dropped, and one person is capped at 12 reports a day. Unconfirmed reports stay visible, lightly, and do not count as hours without power.
- **Map and dashboard.** A Leaflet map on OpenStreetMap, a list grouped by city, hours without power over the last 7 days, and the chance for the next hour. English and Arabic, with Arabic laid out right to left. Strings are typed dictionaries, so a missing translation fails the test.
- **Forecast.** Each neighbourhood gets a probability for every hour of the next day. The page shows the model, the usual rate for that hour, and the largest reasons the two differ.
- **Alerts.** A Telegram subscription watches one neighbourhood. When the next hour crosses the chosen threshold (40%, 55%, or 70%), the bot sends one note for that hour. When a confirmed outage that subscription was tracking ends, it sends a power-back note.
- **Open API.** Read areas, current outages, timelines, stats, forecasts, and hourly history. Post a report from another client. The contract is OpenAPI 3.1 at `/api/openapi`.

## How the forecast works

Each past hour in a neighbourhood is labeled out or on. An hour counts as out only when a confirmed outage covers at least 30 minutes of it.

Two models are fit on that history.

The **baseline** is a frequency. For each neighbourhood and each hour of the week, it is the share of past hours that were out, with a 21-day half-life so last month counts more than last winter. Hours with little history shrink toward the overall rate.

**Logistic regression** starts from that usual chance and adjusts it. The other inputs are the fraction of the last 24 hours that were out, the same for the last 7 days, whether this hour was out a week ago, sine and cosine of the hour and the weekday, and temperature. Temperature comes from the [Open-Meteo](https://open-meteo.com/) forecast when it answers (no key). If it does not, Barq uses a seasonal curve for the latitude. A positive adjustment raises the chance. The chart lists the largest adjustments in log-odds, which is why an hour is high or low.

The running demo refits both models on its own seeded history. The homepage uses the seasonal temperature curve so the map can render without waiting on the weather service. The neighbourhood page asks Open-Meteo, with a short timeout.

### Why this stack, and why not a heavier model

The models are TypeScript in `@barq/core`, next to the report rules. One runtime means `npm install` and `npm run demo` are enough to try the product, and the logistic weights are the explanation on the page. A separate Python service would score a boosted tree and then need a second process, a second deploy, and a way to show the reason. The hour-of-week baseline already captures a weekly schedule. What is left is a small adjustment for recent cuts and heat, which is what a linear model is for.

### Scores

Both models are fit only on earlier days of a fixed synthetic history (80 days, 25 neighbourhoods, seed `20261010`, origin `2026-06-15T12:00:00Z`) and scored on the last 14 days. The holdout is not used to choose weights. `npm test` checks that the logistic model beats the baseline, and that the numbers still match `docs/model-metrics.json`.

| Model | Brier (lower is better) | AUC |
| --- | ---: | ---: |
| Constant at the base rate | 0.1673 | — |
| Hour-of-week baseline | 0.1379 | 0.7398 |
| L2 logistic regression | 0.1331 | 0.7522 |

About 21% of holdout hours were out. Skill against the constant forecast is 0.176 for the baseline and 0.205 for logistic regression. Calibration of the logistic model on that holdout:

| Predicted band | Mean prediction | Observed rate | Hours |
| --- | ---: | ---: | ---: |
| 0.0–0.2 | 0.107 | 0.111 | 5691 |
| 0.2–0.4 | 0.279 | 0.269 | 1418 |
| 0.4–0.6 | 0.500 | 0.473 | 659 |
| 0.6–0.8 | 0.689 | 0.652 | 457 |
| 0.8–1.0 | 0.839 | 0.909 | 175 |

The gain over the baseline is real and modest. A high probability is a pattern in past hours, not a schedule published by a utility.

## Architecture

```mermaid
flowchart TB
  people[People in a neighbourhood]
  web[Next.js web app]
  bot[Telegram bot]
  api[REST API]
  core["@barq/core — reports, forecast, alerts"]
  db["@barq/db — Drizzle"]
  pg[(Postgres)]
  lite[(PGlite demo file)]
  meteo[Open-Meteo]

  people --> web
  people --> bot
  web --> api
  api --> core
  bot --> core
  core --> db
  db --> pg
  db --> lite
  api --> meteo
```

Areas are country, then city, then neighbourhood. Nothing in the schema is tied to one country. Reporter ids are salted hashes. Postgres is the full-mode database. With no `DATABASE_URL`, the same schema runs on a PGlite file at `data/barq`, which is created on first start and seeded with the synthetic history.

## Run it

Node.js 22 or newer.

```bash
npm install
npm run demo
```

Open [http://localhost:3000](http://localhost:3000). The first request migrates, seeds, and fits the models, so it takes a few seconds. The amber banner means the history is synthetic.

| Command | What it does |
| --- | --- |
| `npm run demo` | Web app in demo mode |
| `npm test` | Vitest, including the forecast holdout |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript across core, db, web, and bot |
| `npm run build` | Production build of the web app |
| `npm run eval` | Rewrite `docs/model-metrics.json` from the fixed benchmark |
| `npm run bot` | Telegram bot. Exits if `TELEGRAM_BOT_TOKEN` is unset |

`DATABASE_URL=memory npm run demo` keeps the demo database in memory. `DATABASE_URL=postgres://barq:barq@localhost:5432/barq` uses Postgres. Set `SEED_SYNTHETIC=true` to load the sample history into an empty database.

### Docker

```bash
docker compose up --build
```

That starts Postgres 16 and the web app on port 3000, with the synthetic seed. The bot is a separate profile:

```bash
TELEGRAM_BOT_TOKEN=your-token docker compose --profile bot up --build
```

In Telegram: `/report`, `/subscribe`, `/unsubscribe`, `/status`, `/lang en` or `/lang ar`.

### API

GET requests allow any origin. `POST /api/reports` takes `{ "areaId", "kind": "off" | "on", "deviceId" }`. `deviceId` is an id the client generates; the server stores a hash.

| Method | Path |
| --- | --- |
| GET | `/api/health` |
| GET | `/api/areas` and `/api/areas/{id}` |
| GET | `/api/outages` (`status=active` by default, or `recent`) |
| GET | `/api/areas/{id}/timeline` |
| GET | `/api/areas/{id}/stats` |
| GET | `/api/areas/{id}/predictions` |
| POST | `/api/reports` |
| GET | `/api/export/hours` |
| GET | `/api/metrics` |
| GET | `/api/openapi` |

## Tests

GitHub Actions runs lint, typecheck, test, and build on Node 22. The forecast tests train both models on the fixed history, score the holdout, and require logistic regression to beat the baseline on Brier score and to stay above 0.73 AUC. Report tests cover confirmation, duplicates, the rate limit, and the daily cap. An ingest test runs the same rules against an in-memory database.

## Roadmap

- More languages, using the same typed dictionary.
- Import a published utility schedule where a city actually posts one, kept separate from crowdsourced reports.
- Alerts beyond Telegram.
- A stronger notion of “a different person” than a browser id or a Telegram account.
- Real contributed history in place of the synthetic seed, still labeled for what it is.

## License

[MIT](LICENSE). Copyright 2026 Maeen Alganimi.
