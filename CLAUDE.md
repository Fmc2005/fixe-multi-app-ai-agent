# Landing

This file guides AI coding agents working on this repository. Keep the MVP small, reliable, and demo-ready.

## Product

Landing is an AI relocation agent for students and young professionals arriving in a new city. It learns the user's preferences, understands their destination and schedule, recommends nearby food and grocery options, builds a basic essentials cart, and executes approved actions.

Core promise: **handle the user's first 72 hours in a new city.**

## External integrations

The MVP must use exactly these three external applications:

1. **Google Maps Platform**
   - Places API New for autocomplete, text or nearby search, and place details.
   - Maps JavaScript API for the map UI when time allows.
   - Recommend restaurants, grocery stores, and useful nearby places.

2. **Google Calendar**
   - Read arrival information and existing events.
   - Detect free time and calendar conflicts.
   - Create approved itinerary events.

3. **Zinc API**
   - Search for basic groceries and arrival essentials.
   - Create orders only in the Zinc sandbox.
   - Demonstrate success and failure handling without spending real money.

Do not add Yelp or Luma to the MVP.

## Important Google Maps limitation

Do not assume Google OAuth or the Places API provides the user's private Timeline, most-frequented places, saved lists, or personal review history.

For the hackathon onboarding, use one of these consent-based inputs:

- The user selects 3–5 favorite places using Google Places autocomplete.
- The user uploads a small Google Maps export or compatible JSON file.
- Demo mode loads a clearly labeled sample dataset from a team member.

Use the Places API to enrich those place IDs with live categories, ratings, price levels, hours, and coordinates. Infer a preference profile, then ask the user to confirm dietary restrictions, budget, transportation, and interests.

Never claim that sample or user-provided data was automatically retrieved from private Google Maps history.

## Primary workflow

1. Connect Google or enter demo mode.
2. Collect destination, approximate address, arrival time, and total budget.
3. Collect favorite places or load the consented demo dataset.
4. Infer and confirm the user's preference profile.
5. Read the first 72 hours from Google Calendar.
6. Search Google Places for food, groceries, and useful nearby locations.
7. Rank candidates deterministically.
8. Build and display a structured landing plan.
9. Ask for explicit user approval.
10. Create approved Calendar events and submit the approved Zinc sandbox order.
11. Show a trace of every integration call and its result.

## Functional requirements

- Capture destination, arrival, budget, dietary restrictions, and mobility preferences.
- Accept at least three Google Maps preference signals.
- Read Calendar events and avoid schedule conflicts.
- Return at least one food recommendation and one grocery store.
- Rank places using preference match, price, distance, rating, and opening hours.
- Search Zinc for a short list of basic items within the budget.
- Display the complete plan and estimated cost before execution.
- Require approval before every external write action.
- Create Calendar events and preserve returned event IDs.
- Create only sandbox Zinc orders and preserve returned order status or ID.
- Support partial results when one integration fails.
- Show retry options and never report an action as successful without API confirmation.

## Non-functional requirements

- Use typed schemas for all tool inputs, API responses, and the final plan.
- Keep secrets server-side and out of logs, traces, client bundles, and git.
- Use minimum Google OAuth scopes.
- Add timeouts and at most one automatic retry with backoff per external call.
- Make writes idempotent using an `operationId` or equivalent key.
- Target an initial plan response within 12 seconds under normal conditions.
- Make recommendations explainable with observable ranking signals.
- Keep the main flow usable in four screens or fewer.
- Preserve user privacy and minimize retention of location data.

## Suggested architecture

Use a single Next.js and TypeScript application. Avoid databases and microservices for the hackathon MVP.

```text
src/
  app/
    page.tsx
    api/plan/route.ts
    api/execute/route.ts
  agent/
    orchestrator.ts
    schemas.ts
    ranking.ts
  integrations/
    google-maps.ts
    google-calendar.ts
    zinc.ts
  reliability/
    trace.ts
    retry.ts
    idempotency.ts
  fixtures/
    demo-profile.json
    api-responses/
```

The frontend should call two main endpoints:

- `POST /api/plan` — returns a validated `LandingPlan` without external writes.
- `POST /api/execute` — receives only approved action IDs and executes them idempotently.

## Core data contracts

The planner must return structured data similar to:

```ts
type LandingPlan = {
  destination: string;
  arrivalAt: string;
  profile: UserPreferenceProfile;
  recommendations: PlaceRecommendation[];
  essentials: EssentialItem[];
  proposedActions: ProposedAction[];
  estimatedTotal: number;
  warnings: string[];
  trace: ToolTrace[];
};
```

Every external action must return:

```ts
type ActionResult = {
  actionId: string;
  integration: "google-calendar" | "zinc";
  status: "success" | "failed" | "pending";
  externalId?: string;
  errorCode?: string;
  retryable: boolean;
};
```

## Ranking

Do not let the LLM choose places arbitrarily. Normalize API results and calculate a deterministic score, for example:

- 30% preference match
- 25% affordability
- 20% distance
- 15% rating
- 10% open at the proposed time

If a field is missing, redistribute its weight across available signals and record that in the trace. The LLM may explain recommendations, but it must not invent prices, ratings, hours, or distances.

## Frontend

Prioritize these four states:

1. **Connect** — Google connection and demo mode.
2. **Know you** — destination, arrival, budget, favorite places, and confirmation questions.
3. **Landing plan** — recommendations, short itinerary, estimated cost, Zinc cart, and approval button.
4. **Execution** — Calendar and Zinc results plus Agent Trace and retry controls.

Build with mocked `LandingPlan` data first, then replace the mock source with the live endpoint without changing the UI components.

## Reliability rules

- Validate all model and API outputs before using them.
- Never execute a write during plan generation.
- Never execute without explicit approval.
- Never claim success before receiving a successful API response.
- Prevent duplicate events and orders on double-click or retry.
- Log tool name, status, duration, attempt count, and masked external ID.
- Return a usable partial plan if Maps, Calendar, or Zinc is unavailable.
- Keep recorded fixtures as a documented demo fallback, not as fake live responses.

Minimum test scenarios:

1. Happy path across all three integrations.
2. Total would exceed the user's budget.
3. Proposed activity conflicts with Calendar.
4. Recommended place is closed at the proposed time.
5. Places returns no result in the initial radius.
6. Approval endpoint is called twice.
7. Zinc reports out of stock or price exceeded.
8. Calendar times out or returns an error.

## Development order

1. Define schemas, environment variables, and the demo fixture.
2. Make each integration work independently without AI.
3. Normalize responses behind small adapter functions.
4. Build the frontend against mocked structured data.
5. Implement deterministic ranking and plan generation.
6. Add approval-gated execution.
7. Add trace, validation, retry, and idempotency.
8. Run the eight reliability scenarios.
9. Deploy, smoke test, freeze features, and record the two-minute demo.

## Definition of done

The MVP is complete when a user can provide relocation context, receive live Google Places recommendations around the destination, avoid a real Calendar conflict, approve a structured plan, create confirmed Calendar events, submit a confirmed Zinc sandbox order, and inspect an accurate trace of the workflow.

The repository README must explain what was built, the three external apps, how to run it, how reliability was tested, and link to the two-minute demo.

## Out of scope

- Yelp and Luma
- Automatic access to private Google Maps Timeline or review history
- Real Zinc purchases or payment credentials
- Database, long-term memory, or background sync
- Mobile application
- Multiple autonomous agents
- Authentication beyond what is needed for Google Calendar
- Features that do not improve the core demo or reliability evidence

## Agent working rules

- Inspect the existing repository before editing.
- Preserve working code and unrelated user changes.
- Prefer the smallest implementation that completes the primary workflow.
- Do not add dependencies unless they materially reduce delivery risk.
- Keep API-specific logic inside integration adapters.
- Add or update tests for behavior changed by the task.
- Run relevant checks before claiming completion.
- Report remaining mocks, missing credentials, failed tests, and known limitations explicitly.
