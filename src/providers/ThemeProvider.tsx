import type { ReactNode } from "react";
import { ThemeProviderContext } from "@/context/ThemeContext";
import { useSettingsStore } from "@/store/settingsStore";

export type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
};

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const theme = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  const setTheme = (t: Theme) => {
    setThemeMode(t ?? defaultTheme);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
