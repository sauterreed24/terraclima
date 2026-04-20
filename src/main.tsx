import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UnitProvider } from "./lib/units";
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
