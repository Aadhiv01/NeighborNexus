import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/figtree";
import "./index.css";
import { applySettings, loadSettings } from "./theme/themeStore";
import { router } from "./App";

// Set the theme attributes before the first paint so there is no flash.
applySettings(loadSettings());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
