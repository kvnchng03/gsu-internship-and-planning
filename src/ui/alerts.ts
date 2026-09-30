// Deadline alerts: a phone or desktop notification for urgent deadlines when the app opens.
// A static site can't push while the app is closed; Google Calendar reminders cover that.
import { state } from "../lib/store";
import { dueInfo } from "../lib/postings";
import { t } from "../lib/i18n";

const SEEN_KEY = "internship-ledger-alerted";
export const alertsSupported = (): boolean => "Notification" in window && "serviceWorker" in navigator;
export const alertsOn = (): boolean => alertsSupported() && Notification.permission === "granted";
/** Browsers only show the permission prompt in response to a tap, so this runs from a button. */
export async function enableAlerts(): Promise<NotificationPermission> {
  if (!alertsSupported()) return "denied";
  const result = await Notification.requestPermission();
  if (result === "granted") await checkDeadlines();
  return result;
}

function seen(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") as Record<string, string>; } catch { return {}; }
}
/** Notifies about overdue and 3-day deadlines, at most once a day per posting. */
export async function checkDeadlines(): Promise<void> {
  if (!alertsOn() || state.example) return;
  const today = new Date().toISOString().slice(0, 10);
  const log = seen();
  const due = state.postings.map(p => ({ p, d: dueInfo(p) })).filter(x => x.d && (x.d.level === "overdue" || x.d.level === "urgent") && log[x.p.id] !== today);
  if (!due.length) return;
  const reg = await navigator.serviceWorker.ready;
  for (const { p, d } of due) {
    const name = p.company || t("Internship");
    await reg.showNotification(d?.level === "overdue" ? t("Overdue: {name}", { name }) : t("Due soon: {name}", { name }), {
      body: (p.role ? p.role + " · " : "") + d?.text,
      tag: "deadline-" + p.id,
      icon: import.meta.env.BASE_URL + "pwa-192x192.png",
      badge: import.meta.env.BASE_URL + "pwa-64x64.png",
    });
    log[p.id] = today;
  }
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(log)); } catch { /* storage full or blocked */ }
}
