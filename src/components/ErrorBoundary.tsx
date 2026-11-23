import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError } from "../lib/chunk-load-error";

interface Props {
  children: ReactNode;
  reloadPage?: () => void;
}

interface State {
  err: Error | null;
  chunkError: boolean;
}

/**
 * Catches render errors so a single bad panel does not white-screen the shell.
 * Operational deployments: users see a recovery affordance instead of a blank root.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null, chunkError: false };

  static getDerivedStateFromError(err: Error): State {
    return { err, chunkError: isChunkLoadError(err) };
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
      const chunkError = this.state.chunkError;
      return (
        <div role="alert" className="tc-error-boundary">
          <p className="font-atlas text-lg mb-2 text-ice">
            {chunkError ? "Part of the atlas did not load" : "Something went wrong"}
          </p>
          <p className="text-sm text-stone mb-4 max-w-md">
            {chunkError
              ? "Part of the app failed to download. This usually happens just after an update or on a weak connection. Try the download again, or reload the atlas from the start."
              : "The atlas ran into an error. Try this view again. If a shared link keeps failing, start again from the atlas home."}
          </p>
          <div className="tc-error-boundary__actions">
            <button
              type="button"
              className="tc-error-boundary__btn"
              // Recovery UI: focus must land on the safest actionable control immediately.
              // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional error-recovery affordance
              autoFocus
            onClick={chunkError ? this.reloadPage : this.openFreshAtlas}
          >
            {chunkError ? "Retry download" : "Open fresh atlas"}
          </button>
          <button
            type="button"
            className="tc-error-boundary__btn tc-error-boundary__btn--secondary"
            onClick={this.reloadPage}
          >
            {chunkError ? "Open fresh atlas" : "Retry current view"}
          </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
