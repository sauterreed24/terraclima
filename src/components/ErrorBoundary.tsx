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
        <div role="alert" className="tc-error-boundary">
          <p className="font-atlas text-lg mb-2 text-ice">Something went wrong</p>
          <p className="text-sm text-stone mb-4 max-w-md">
            The atlas hit an unexpected error. You can reload the page — your last unit preference is stored in the browser.
          </p>
          <button
            type="button"
            className="tc-error-boundary__btn"
            // Recovery UI: focus must land on the only actionable control immediately.
            // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional error-recovery affordance
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
