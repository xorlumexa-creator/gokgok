import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppServiceWorker } from "./lib/registerServiceWorker";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

// Disable animations on WebView/Android
if (typeof navigator !== 'undefined' && 
    (navigator.userAgent.includes('wv') || 
     navigator.userAgent.includes('Android'))) {
  document.documentElement.style.setProperty('--animation-duration', '0ms');
}

registerAppServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

// REQUIRED: tells capacitor-updater the new bundle loaded successfully.
// Without this call, the plugin assumes the update crashed the app and
// automatically rolls back to the previous bundle on next launch.
CapacitorUpdater.notifyAppReady().catch(() => {
  // No-op on web/dev where the native plugin isn't present.
});
