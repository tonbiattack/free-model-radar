import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/app.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root が見つかりません");

// GitHub Pages でサブディレクトリ配信するため、base path を Router に渡す。
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
