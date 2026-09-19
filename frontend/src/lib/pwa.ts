/**
 * PWA registration.
 *
 * In dev the service worker is actively harmful — it can serve stale Vite module
 * URLs and blank the screen — so we UNREGISTER any worker previously installed on
 * this origin and purge its caches. The worker is only registered in production
 * builds, where asset URLs are content-hashed.
 */
export function setupPwa(): void {
  if (!("serviceWorker" in navigator)) return;

  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
    return;
  }

  // dev: tear down anything left behind by an earlier visit
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {});
  }
}
