import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureError } from "@/app/telemetry";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    captureError(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = () => this.setState({ error: null });

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-surface-page text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-white/60">
            The app hit an unexpected error. You can try resetting the view or reloading.
          </p>
          <pre className="text-xs bg-black/40 border border-white/10 rounded-lg p-3 overflow-auto max-h-40">
            {this.state.error.message}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              Reset
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 rounded-lg bg-purple-500/80 hover:bg-purple-500 transition"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
