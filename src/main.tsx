import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// NOTE: The previous vite-plugin-pwa service worker has been removed because
// a stale precache was serving old HTML to returning visitors (causing
// 404s on /consent/<token> links). A kill-switch worker is shipped at
// /sw.js (see public/sw.js) so existing registrations self-unregister and
// clear their caches on the next visit. Do NOT re-add registerSW here
// without the guarded wrapper described in the PWA skill.

createRoot(document.getElementById("root")!).render(<App />);
