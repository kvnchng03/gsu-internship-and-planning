// Google Calendar sync: signs in with Google in the browser (no server) and keeps one event per deadline.
// Turned on by setting VITE_GOOGLE_CLIENT_ID at build time; without it the option stays hidden.
import type { CalEvent } from "../lib/calendar";
import { nextDay } from "../lib/calendar";
import { t } from "../lib/i18n";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
/** Marks the events this app owns, so a sync never touches anything else in the calendar. */
const APP_TAG = "gsu-planner";

export const googleSyncAvailable = (): boolean => !!CLIENT_ID;

// The small part of Google Identity Services this uses
interface TokenResponse { access_token?: string; expires_in?: number; error?: string; error_description?: string }
interface TokenClient { requestAccessToken(opts?: { prompt?: string }): void }
interface GoogleOAuth { initTokenClient(cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }): TokenClient }
declare global { interface Window { google?: { accounts: { oauth2: GoogleOAuth } } } }

let gisLoaded: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLoaded ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gisLoaded = null; reject(new Error(t("Couldn't reach Google. Check your connection."))); };
    document.head.append(s);
  });
  return gisLoaded;
}

// The access token lives in memory only, for this visit (Google makes it last about an hour)
let cached: { token: string; expires: number } | null = null;
export const googleConnected = (): boolean => !!cached && cached.expires > Date.now();

/** Asks Google for a short-lived access token. Google shows its own sign-in and consent screens. */
async function getToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  if (!CLIENT_ID) throw new Error(t("Google Calendar sync isn't set up for this site."));
  await loadGis();
  const oauth = window.google?.accounts.oauth2;
  if (!oauth) throw new Error(t("Couldn't load Google sign-in."));
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: r => {
        if (!r.access_token) { reject(new Error(r.error_description || r.error || t("Google sign-in didn't finish."))); return; }
        cached = { token: r.access_token, expires: Date.now() + (r.expires_in || 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: e => reject(new Error(e.type === "popup_closed" ? t("Google sign-in was closed.") : t("Google sign-in was blocked. Allow pop-ups and try again."))),
    });
    client.requestAccessToken();
  });
}

interface GEvent {
  id: string;
  summary?: string;
  htmlLink?: string;
  location?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}
async function api<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (res.status === 401) cached = null; // expired or revoked: the next try signs in again
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(t("Google Calendar said: {message}", { message: body?.error?.message || res.status + " " + res.statusText }));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

function body(e: CalEvent) {
  return {
    summary: e.title,
    description: e.details,
    start: { date: e.date },
    end: { date: nextDay(e.date) },
    transparency: "transparent",
    // Phone notifications at 9am three days before and the day before (minutes before the all-day start)
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 2 * 1440 + 900 }, { method: "popup", minutes: 900 }] },
    extendedProperties: { private: { app: APP_TAG, ledgerId: e.uid } },
  };
}

export interface SyncResult { added: number; updated: number; removed: number }
/** Makes the calendar match the deadlines: adds new ones, updates changed ones, removes ones no longer open. */
export async function syncToGoogle(events: CalEvent[]): Promise<SyncResult> {
  const token = await getToken();
  const existing: GEvent[] = [];
  let pageToken = "";
  do {
    const q = new URLSearchParams({ privateExtendedProperty: "app=" + APP_TAG, maxResults: "250", showDeleted: "false" });
    if (pageToken) q.set("pageToken", pageToken);
    const page = await api<{ items?: GEvent[]; nextPageToken?: string }>(token, API + "?" + q);
    existing.push(...(page.items || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  const byLedger = new Map(existing.map(e => [e.extendedProperties?.private?.ledgerId || "", e]));
  const result: SyncResult = { added: 0, updated: 0, removed: 0 };
  for (const e of events) {
    const found = byLedger.get(e.uid);
    if (found) { await api(token, API + "/" + encodeURIComponent(found.id), { method: "PUT", body: JSON.stringify(body(e)) }); result.updated++; }
    else { await api(token, API, { method: "POST", body: JSON.stringify(body(e)) }); result.added++; }
  }
  const keep = new Set(events.map(e => e.uid));
  for (const [ledgerId, found] of byLedger) {
    if (!keep.has(ledgerId)) { await api(token, API + "/" + encodeURIComponent(found.id), { method: "DELETE" }); result.removed++; }
  }
  return result;
}

/** One event on the calendar, from Google or from the app. */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  /** Exclusive end. All-day events end at midnight after their last day. */
  end: Date;
  allDay: boolean;
  source: "google" | "deadline";
  link?: string;
  location?: string;
  /** For deadlines: which posting, and how urgent. */
  postingId?: string;
  level?: string;
}

const midnight = (date: string) => new Date(date + "T00:00:00");

/**
 * Events from the student's main Google Calendar that overlap [from, to).
 * Deadlines this app synced are left out, since the calendar already shows them from the app.
 */
export async function fetchGoogleEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
  const token = await getToken();
  const items: GEvent[] = [];
  let pageToken = "";
  do {
    const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250" });
    if (pageToken) q.set("pageToken", pageToken);
    const page = await api<{ items?: GEvent[]; nextPageToken?: string }>(token, API + "?" + q);
    items.push(...(page.items || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  const out: CalendarEvent[] = [];
  for (const e of items) {
    if (e.status === "cancelled" || e.extendedProperties?.private?.app === APP_TAG) continue;
    const allDay = !!e.start?.date;
    const start = allDay ? midnight(e.start?.date || "") : new Date(e.start?.dateTime || "");
    const end = allDay ? midnight(e.end?.date || nextDay(e.start?.date || "")) : new Date(e.end?.dateTime || e.start?.dateTime || "");
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    out.push({ id: e.id, title: e.summary || "(No title)", start, end: end > start ? end : new Date(start.getTime() + 30 * 60_000), allDay, source: "google", link: e.htmlLink, location: e.location });
  }
  return out;
}
