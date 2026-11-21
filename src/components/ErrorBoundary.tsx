import { Component, type ErrorInfo, type ReactNode } from "react";
import { PixelArt } from "./PixelArt";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Chipboy Studio crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="studio-page flex min-h-screen items-center justify-center p-6">
        <section className="console-shell max-w-xl p-8 text-center" role="alert">
          <PixelArt type="ghost" className="mx-auto h-16 w-16" />
          <h1 className="font-pixel mt-5 text-2xl text-[var(--case-ink)]">THE CARTRIDGE JAMMED.</h1>
          <p className="mt-4 text-sm text-[var(--case-muted)]">A component crashed, but your autosave may still be in the Project Vault. Reload to get back to the studio.</p>
          <pre className="mt-4 max-h-32 overflow-auto rounded border border-[var(--case-border)] bg-[var(--case-light)] p-3 text-left text-[10px] text-[var(--berry-dark)]">{this.state.error.message}</pre>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => window.location.reload()} className="play-button rounded px-4 py-2 text-[11px] font-bold">RELOAD STUDIO</button>
            <button onClick={() => { this.setState({ error: null }); window.location.assign("/"); }} className="hardware-button rounded px-4 py-2 text-[11px] font-bold">RESET SESSION</button>
          </div>
        </section>
      </main>
    );
  }
}
