import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles.css";
import "./mobile.css";
import { MobileRoot } from "./MobileRoot";

const root = document.getElementById("root");
if (!root) throw new Error("Missing mobile root");
createRoot(root).render(
  <StrictMode>
    <MobileRoot />
  </StrictMode>,
);
