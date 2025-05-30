import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    isHydrated: boolean;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: "light",
            isHydrated: false,
            toggleTheme: () => {
                const newTheme = get().theme === "light" ? "dark" : "light";
                set({ theme: newTheme });
            },
            setTheme: (theme: Theme) => {
                set({ theme });
            },
        }),
        {
            name: "theme-storage",
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isHydrated = true;
                }
            },
        },
    ),
);
