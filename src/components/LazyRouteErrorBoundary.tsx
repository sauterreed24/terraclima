import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError } from "../lib/chunk-load-error";

interface Props {
  children: ReactNode;
  /** Short label for the route (e.g. "Climate Trips"). */
  routeLabel?: string;
}

interface State {
  err: Error | null;
  chunkError: boolean;
}

/**
 * Route-scoped error boundary for lazy-loaded views. Surfaces chunk-load
 * recovery when a dynamic import fails; rethrows non-chunk errors to the
 * outer shell boundary.
 */
export class LazyRouteErrorBoundary extends Component<Props, State> {
  state: State = { err: null, chunkError: false };

  static getDerivedStateFromError(err: Error): State {
    return { err, chunkError: isChunkLoadError(err) };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[Terraclima lazy route]", err, info.componentStack);
    }
  }

  private reloadPage = () => {
    window.location.reload();
  };

  private openFreshAtlas = () => {
    const rootUrl = new URL(import.meta.env.BASE_URL || "./", window.location.href);
    rootUrl.search = "";
    rootUrl.hash = "";
    window.history.replaceState(null, "", rootUrl);
    window.location.reload();
  };

  render() {
    const { err, chunkError } = this.state;
    if (!err) return this.props.children;

    if (!chunkError) {
      return (
        <div role="alert" className="tc-error-boundary panel p-5">
          <p className="font-atlas text-lg mb-2 text-ice">Something went wrong</p>
          <p className="text-sm text-stone mb-4 max-w-md">
            {this.props.routeLabel
              ? `${this.props.routeLabel} hit an unexpected error. Retry the view or open a fresh atlas.`
              : "The atlas hit an unexpected error. Open a fresh atlas if this shared URL keeps failing, or retry the current view."}
          </p>
          <div className="tc-error-boundary__actions">
            <button
              type="button"
              className="tc-error-boundary__btn"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional error-recovery affordance
              autoFocus
              onClick={this.reloadPage}
            >
              Retry current view
            </button>
            <button
              type="button"
              className="tc-error-boundary__btn tc-error-boundary__btn--secondary"
              onClick={this.openFreshAtlas}
            >
              Open fresh atlas
            </button>
          </div>
        </div>
      );
    }

    const route = this.props.routeLabel ?? "this view";
    return (
      <div role="alert" className="tc-error-boundary panel p-5">
        <p className="font-atlas text-lg mb-2 text-ice">Could not load {route}</p>
        <p className="text-sm text-stone mb-4 max-w-md">
          The atlas bundle for {route} failed to download. This often happens on a flaky connection or right after a deploy. Retry the download or open a fresh atlas.
        </p>
        <div className="tc-error-boundary__actions">
          <button
            type="button"
            className="tc-error-boundary__btn"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional error-recovery affordance
            autoFocus
            onClick={this.reloadPage}
          >
            Retry download
          </button>
          <button
            type="button"
            className="tc-error-boundary__btn tc-error-boundary__btn--secondary"
            onClick={this.openFreshAtlas}
          >
            Open fresh atlas
          </button>
        </div>
      </div>
    );
  }
}
