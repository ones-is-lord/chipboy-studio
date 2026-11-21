import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/pixelify-sans/latin-400.css";
import "@fontsource/pixelify-sans/latin-600.css";
import "@fontsource-variable/nunito";
import App from "./App.tsx";
import { initNativeShell } from "./lib/native";
import "./globals.css";

void initNativeShell();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
