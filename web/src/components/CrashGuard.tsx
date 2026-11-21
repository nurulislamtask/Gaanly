import { Component, type ReactNode } from "react";

/** Catches a crash in any screen: shows what went wrong and a way out, instead of a blank page. */
export class CrashGuard extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const reset = () => {
      try {
        // A bad saved setting is the usual cause of a crash on start; clear the app's own keys.
        for (const k of Object.keys(localStorage)) if (k.startsWith("gaanly")) localStorage.removeItem(k);
      } catch {
        /* storage unavailable */
      }
      location.reload();
    };
    return (
      <div style={{ padding: 24, color: "#fff", background: "#06142e", minHeight: "100dvh", fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.8, margin: "12px 0" }}>{String(error.stack || error.message).slice(0, 900)}</pre>
        <button onClick={() => location.reload()} style={{ padding: "10px 18px", borderRadius: 999, background: "#fff", color: "#000", marginRight: 8 }}>Reload</button>
        <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid #fff8", color: "#fff" }}>Reset app settings</button>
      </div>
    );
  }
}
