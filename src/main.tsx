import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UnitProvider } from "./lib/units";
import { registerServiceWorker } from "./lib/pwa";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UnitProvider>
        <App />
      </UnitProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// PWA: progressive enhancement only. Bails immediately in dev or in
// environments without serviceWorker support. When a new version is
// installed and waiting, the registration's controllerchange listener
// reloads the page once on activation so the UI catches up to the new
// bundle without an explicit user prompt.
registerServiceWorker();
