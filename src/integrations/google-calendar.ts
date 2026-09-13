import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

/**
 * Google Calendar adapter (OAuth 2.0, `calendar.events` scope only — see
 * .env.example). Docs: https://developers.google.com/calendar/api/v3/reference/events
 *
 * Scope needed: https://www.googleapis.com/auth/calendar.events
 * Do NOT request broader Calendar or general Google account scopes.
 */

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
};

export type CreateEventInput = {
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  /** Stored in extendedProperties.private so retries are idempotent. */
  operationId: string;
};

export type CreatedEvent = {
  id: string;
  htmlLink: string | null | undefined;
};

function oauthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error("Google Calendar OAuth env vars are not fully set");
  }
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function calendarClient() {
  return google.calendar({ version: "v3", auth: oauthClient() });
}

function toCalendarEvent(event: calendar_v3.Schema$Event): CalendarEvent | undefined {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !start || !end) return undefined;
  return { id: event.id, summary: event.summary ?? "(no title)", start, end };
}

/** Lists events in [timeMin, timeMax), used to read the first 72 hours. */
export async function listEvents(
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const calendar = calendarClient();
  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });
  return (response.data.items ?? [])
    .map(toCalendarEvent)
    .filter((e): e is CalendarEvent => e !== undefined);
}

/** True if [start, end) overlaps any existing event. */
export function hasConflict(
  start: string,
  end: string,
  events: CalendarEvent[],
): boolean {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  return events.some((event) => {
    const eventStart = Date.parse(event.start);
    const eventEnd = Date.parse(event.end);
    return startMs < eventEnd && endMs > eventStart;
  });
}

/**
 * Creates an event. Idempotent by `operationId`: callers should route
 * through `idempotencyStore.getOrCreate(operationId, ...)` (see
 * src/reliability/idempotency.ts) so a retry never double-books.
 */
export async function createEvent(input: CreateEventInput): Promise<CreatedEvent> {
  const calendar = calendarClient();
  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start },
      end: { dateTime: input.end },
      extendedProperties: { private: { operationId: input.operationId } },
    },
  });
  if (!response.data.id) {
    throw new Error("Calendar event creation returned no id");
  }
  return { id: response.data.id, htmlLink: response.data.htmlLink };
}
