import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  err: Error | null;
}

/**
 * Catches render errors so a single bad panel does not white-screen the shell.
 * Operational deployments: users see a recovery affordance instead of a blank root.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[Terraclima]", err, info.componentStack);
    }
  }

  render() {
    if (this.state.err) {
      return (
        <div
          role="alert"
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
          style={{ background: "#faf5ed", color: "#3d342c" }}
        >
          <p className="font-atlas text-lg mb-2">Something went wrong</p>
          <p className="text-sm opacity-80 mb-4 max-w-md">
            The atlas hit an unexpected error. You can reload the page — your last unit preference is stored in the browser.
          </p>
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "linear-gradient(180deg,#4dd8f5 0%,#0ea5c9 100%)", color: "#061018" }}
            autoFocus
            onClick={() => window.location.reload()}
          >
            Reload Terraclima
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
