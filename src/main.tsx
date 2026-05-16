import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SequencerMini from "./components/views/SequencerMini";
import "./index.css";
import "./i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";

function Root() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const win = getCurrentWindow();
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
