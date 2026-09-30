// Installing the app: Chrome and Android offer an install prompt; iPhone installs from Safari's Share menu.

interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }
let deferred: InstallPrompt | null = null;

export const isInstalled = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const isIos = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const canPromptInstall = (): boolean => !!deferred && !isInstalled();

/** Listens for the browser's install offer; onChange redraws so the Install button can appear or go away. */
export function watchInstall(onChange: () => void): void {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e as InstallPrompt; onChange(); });
  window.addEventListener("appinstalled", () => { deferred = null; onChange(); });
}
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome === "accepted";
}
