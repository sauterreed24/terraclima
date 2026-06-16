import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  reloadPage?: () => void;
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

  private reloadPage = () => {
    if (this.props.reloadPage) {
      this.props.reloadPage();
      return;
    }
    window.location.reload();
  };

  private openFreshAtlas = () => {
    const rootUrl = new URL(import.meta.env.BASE_URL || "./", window.location.href);
    rootUrl.search = "";
    rootUrl.hash = "";
    window.history.replaceState(null, "", rootUrl);
    this.reloadPage();
  };

  render() {
    if (this.state.err) {
      return (
        <div role="alert" className="tc-error-boundary">
          <p className="font-atlas text-lg mb-2 text-ice">Something went wrong</p>
          <p className="text-sm text-stone mb-4 max-w-md">
            The atlas hit an unexpected error. Open a fresh atlas if this shared URL keeps failing, or retry the current view.
          </p>
          <div className="tc-error-boundary__actions">
            <button
              type="button"
              className="tc-error-boundary__btn"
              // Recovery UI: focus must land on the safest actionable control immediately.
              // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional error-recovery affordance
              autoFocus
              onClick={this.openFreshAtlas}
            >
              Open fresh atlas
            </button>
            <button
              type="button"
              className="tc-error-boundary__btn tc-error-boundary__btn--secondary"
              onClick={this.reloadPage}
            >
              Retry current view
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
