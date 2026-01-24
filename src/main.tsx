import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";

function AppWithWindowShow() {
  useEffect(() => {
    // Show window after React is fully mounted to prevent white flash
    // Now that permissions are added to default.json, this should work
    const showWindow = async () => {
      try {
        const win = getCurrentWindow();
        await win.show();
        await win.setFocus();
      } catch (err) {
        console.error("Failed to show window:", err);
      }
    };

    // Small delay to ensure rendering is stable
    const timer = setTimeout(showWindow, 150);
    return () => clearTimeout(timer);
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppWithWindowShow />
  </React.StrictMode>,
);
