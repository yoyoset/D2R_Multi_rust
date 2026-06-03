import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SequencerMini from "./components/views/SequencerMini";
import "./index.css";
import "./styles.css";
import "./i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { initTheme } from "./lib/theme";

// Apply the persisted theme before first paint to avoid a flash.
initTheme();

function Root() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let win: ReturnType<typeof getCurrentWindow> | null = null;
    try { win = getCurrentWindow(); } catch { win = null; }
    if (!win) { setLabel('main'); return; } // browser/preview fallback
    setLabel(win.label);

    // Show window after React is fully mounted to prevent white flash
    const showWindow = async () => {
      // THE FIX: Sequencer window MUST NOT auto-show. 
      // It is managed by business logic in sequence.rs.
      if (win.label === "sequencer") return;
      
      try {
        await win.show();
        await win.setFocus();
      } catch (err) {
        console.error("Failed to show window:", err);
      }
    };

    const timer = setTimeout(showWindow, 150);
    return () => clearTimeout(timer);
  }, []);

  if (!label) return null;

  if (label === "sequencer") {
    return <SequencerMini />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
