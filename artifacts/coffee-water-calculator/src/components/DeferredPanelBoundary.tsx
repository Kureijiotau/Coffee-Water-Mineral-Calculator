import { Component, type ReactNode } from 'react';

type DeferredPanelBoundaryProps = {
  label: string;
  children: ReactNode;
};

type DeferredPanelBoundaryState = {
  failed: boolean;
};

export class DeferredPanelBoundary extends Component<
  DeferredPanelBoundaryProps,
  DeferredPanelBoundaryState
> {
  state: DeferredPanelBoundaryState = { failed: false };

  static getDerivedStateFromError(): DeferredPanelBoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="app-card mt-3 rounded-2xl border border-rose-300/25 bg-rose-950/20 p-4"
        >
          <p className="text-sm font-semibold text-rose-100">
            {this.props.label} could not be loaded.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rose-100/70">
            Reloading may discard unsaved edits held only in this tab.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 min-h-10 rounded-lg border border-rose-200/25 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function DeferredPanelFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="app-card mt-3 flex min-h-28 items-center justify-center rounded-2xl border border-cyan-300/15 bg-slate-800/70 p-6 text-sm text-slate-300"
    >
      Loading {label}…
    </div>
  );
}