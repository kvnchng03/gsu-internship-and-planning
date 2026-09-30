// Google Calendar sync: signs in with Google in the browser (no server) and keeps one event per deadline.
// Turned on by setting VITE_GOOGLE_CLIENT_ID at build time; without it the option stays hidden.
import type { CalEvent } from "../lib/calendar";
import { nextDay } from "../lib/calendar";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
/** Marks the events this app owns, so a sync never touches anything else in the calendar. */
const APP_TAG = "gsu-planner";

export const googleSyncAvailable = (): boolean => !!CLIENT_ID;

// The small part of Google Identity Services this uses
interface TokenResponse { access_token?: string; error?: string; error_description?: string }
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
    s.onerror = () => { gisLoaded = null; reject(new Error("Couldn't reach Google. Check your connection.")); };
    document.head.append(s);
  });
  return gisLoaded;
}

/** Asks Google for a short-lived access token. Google shows its own sign-in and consent screens. */
async function getToken(): Promise<string> {
  if (!CLIENT_ID) throw new Error("Google Calendar sync isn't set up for this site.");
  await loadGis();
  const oauth = window.google?.accounts.oauth2;
  if (!oauth) throw new Error("Couldn't load Google sign-in.");
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: r => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error_description || r.error || "Google sign-in didn't finish."))),
      error_callback: e => reject(new Error(e.type === "popup_closed" ? "Google sign-in was closed." : "Google sign-in was blocked. Allow pop-ups and try again.")),
    });
    client.requestAccessToken();
  });
}

interface GEvent { id: string; extendedProperties?: { private?: Record<string, string> } }
async function api<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error("Google Calendar said: " + (body?.error?.message || res.status + " " + res.statusText));
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
