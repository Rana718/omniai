"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/store";

export default function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);
    const { theme, isHydrated } = useThemeStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && isHydrated) {
            document.documentElement.classList.toggle("dark", theme === "dark");
        }
    }, [theme, mounted, isHydrated]);

    return <div suppressHydrationWarning={true}>{children}</div>;
}
