import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class AreasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("AreasMapSection crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 rounded-lg border border-red-700/60 bg-red-950/40 text-sm text-red-200 space-y-2">
          <p className="font-semibold">The Areas view failed to render.</p>
          <pre className="whitespace-pre-wrap text-xs text-red-300/90">{this.state.error.message}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 px-3 py-1.5 text-xs rounded-md bg-red-800/70 hover:bg-red-800 text-white"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}