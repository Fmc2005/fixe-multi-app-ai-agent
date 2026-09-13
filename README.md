# Landing — backend setup

AI relocation agent for the first 72 hours in a new city. See [CLAUDE.md](CLAUDE.md)
for the full product/architecture spec. This README covers backend setup only
— the frontend (4-screen flow) comes later.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in keys as they become available
npm run dev                  # http://localhost:3000
```

With no keys set, `DEMO_MODE=true` (the `.env.example` default) makes both
endpoints work end-to-end against the fixtures in `src/fixtures/`.

```bash
curl -X POST http://localhost:3000/api/plan \
  -H "Content-Type: application/json" \
  -d '{"destination":"Boston, MA","approximateAddress":"Fenway, Boston, MA","arrivalAt":"2026-09-15T18:00:00.000Z","budget":150,"demoMode":true}'
```

Take the `planId` and `proposedActions[].actionId` values from that response
into `/api/execute`:

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"planId":"<planId>","approvedActionIds":["<actionId>", "..."]}'
```

## Project layout

```text
src/
  app/api/plan/route.ts       POST /api/plan    — no external writes
  app/api/execute/route.ts    POST /api/execute — approval-gated writes
  agent/
    schemas.ts                 zod schemas + types for every contract
    ranking.ts                 deterministic place scoring
    orchestrator.ts            ties integrations + ranking into a LandingPlan
  integrations/
    google-maps.ts             Places API (New): text/nearby search, details
    google-calendar.ts         OAuth2 + events.list/insert
    zinc.ts                    v2 API: product search, sandbox orders
  reliability/
    trace.ts                   per-request tool call trace
    retry.ts                   timeout + 1 retry with backoff
    idempotency.ts             in-memory operationId -> ActionResult store
  fixtures/
    demo-profile.json          sample PlanRequest for demo mode
    api-responses/             normalized fixture data (demo fallback only)
```

## Filling in credentials

Each integration reads its own env vars (see `.env.example`) and throws a
clear error if they're missing — nothing else needs to change to go from
demo mode to live:

- **Google Maps / Calendar dev**: fill `GOOGLE_MAPS_API_KEY` and the
  `GOOGLE_OAUTH_*` vars, set `DEMO_MODE=false`, and call `/api/plan`. Places
  results have no `distanceMeters` yet (no geocoding step wired in — see the
  `TODO(maps)` in `google-maps.ts`).
- **Zinc dev**: fill `ZINC_API_KEY` with a `zn_test_...` sandbox key. Use the
  documented sandbox product URLs in `zinc.ts` (`test-success`,
  `test-out-of-stock`, `test-price-exceeded`) while testing order creation —
  see the `TODO(zinc)` in `orchestrator.ts` about mapping real search
  results to orderable product URLs.

## Tests

```bash
npm test
```

Covers ranking (weight redistribution when signals are missing), retry
(timeout + single retry), idempotency (no duplicate writes on a repeated
call), and a full demo-mode plan → execute round trip. None require live
credentials. The eight reliability scenarios in CLAUDE.md still need
coverage once each integration is live.

## Status

Backend scaffold: schemas, ranking, orchestrator, reliability utilities, and
all three integration adapters are implemented and typecheck/build/test
clean in demo mode. Live-credential paths are untested pending real API
keys. Frontend not started.
