"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
type Locale = "en" | "zh";

interface SettingsStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  recentSearches: string[];
  addRecentSearch: (symbol: string) => void;
  clearRecentSearches: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      locale: "zh",
      setLocale: (locale) => set({ locale }),
      theme: "system",
      setTheme: (theme) => set({ theme }),
      recentSearches: [],
      addRecentSearch: (symbol) =>
        set((state) => ({
          recentSearches: [
            symbol,
            ...state.recentSearches.filter((s) => s !== symbol),
          ].slice(0, 10),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "settings",
      // 服务端预渲染时没有 localStorage，使用 no-op storage 避免构建期 fallback 噪声。
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage
      ),
    }
  )
);
