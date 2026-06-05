import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppServiceWorker } from "./lib/registerServiceWorker";

// Disable animations on WebView/Android
if (typeof navigator !== 'undefined' && 
    (navigator.userAgent.includes('wv') || 
     navigator.userAgent.includes('Android'))) {
  document.documentElement.style.setProperty('--animation-duration', '0ms');
}

registerAppServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
