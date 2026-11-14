import { createRoot } from "react-dom/client";
import English from "./English.tsx";
import DesignShell from "../DesignShell.tsx";
import "../../web/src/style.css";
import "../preview.css";
import "../design-system.css";
import "./english.css";
createRoot(document.getElementById("root")!).render(
  <DesignShell>
    <main id="main-content" className="reading-area english-area" tabIndex={-1}>
      <English />
    </main>
  </DesignShell>,
);
