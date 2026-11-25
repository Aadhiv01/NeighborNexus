import { useEffect, useState } from "react";

export type Palette = "paper" | "harbor" | "porch";
export type TypeSet = "editorial" | "modern" | "soft";
export type Mode = "light" | "dark";
export type Radius = "sharp" | "soft" | "round";

export interface ThemeSettings {
  palette: Palette;
  type: TypeSet;
  mode: Mode;
  radius: Radius;
}

export const DEFAULTS: ThemeSettings = {
  palette: "paper",
  type: "editorial",
  mode: "light",
  radius: "soft",
};

const KEY = "nn-theme";

export function loadSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage blocked or corrupt: fall back to defaults */
  }
  return DEFAULTS;
}

export function applySettings(s: ThemeSettings) {
  const el = document.documentElement;
  el.dataset.palette = s.palette;
  el.dataset.type = s.type;
  el.dataset.mode = s.mode;
  el.dataset.radius = s.radius;
}

export function useThemeSettings() {
  const [settings, setSettings] = useState<ThemeSettings>(loadSettings);
  useEffect(() => {
    applySettings(settings);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);
  return [settings, setSettings] as const;
}
