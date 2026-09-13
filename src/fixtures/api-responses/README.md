# Fixtures

These files are a **documented demo fallback**, used only when `DEMO_MODE=true`
or when a live integration is unavailable and the orchestrator falls back to
partial/demo data. They are already in the *normalized* shape each adapter
produces (`NormalizedPlace`, calendar `CalendarEvent`, `EssentialItem`) — not
raw Google/Zinc API responses — so the orchestrator can load them directly
without going through `src/integrations/*`.

Never present data loaded from here as if it came from a live API call. The
plan/trace must make it obvious a fixture was used (see CLAUDE.md
"Reliability rules": *"Keep recorded fixtures as a documented demo fallback,
not as fake live responses"*).

- `places.json` — sample Places API (New) results for the demo destination.
- `calendar-events.json` — sample Calendar events for the demo profile.
- `zinc-essentials.json` — sample Zinc search results, one deliberately
  `available: false` to exercise the out-of-stock reliability scenario.
