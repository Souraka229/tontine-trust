import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Titre affiché dans le bandeau d'erreur */
  title?: string;
  /** Repli minimal si une section échoue (landing) */
  compact?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Erreur inattendue";
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: "" });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <p className="font-semibold">{this.props.title ?? "Section indisponible"}</p>
          <p className="mt-1 text-xs text-amber-800/80">{this.state.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 underline"
          >
            <RefreshCw className="w-3 h-3" /> Réessayer
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{this.props.title ?? "Une erreur est survenue"}</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md">{this.state.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[hsl(266_62%_33%)] text-white text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Recharger la page
        </button>
      </div>
    );
  }
}
