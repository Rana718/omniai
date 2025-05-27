"use client";

import { useEffect } from 'react';
import { useThemeStore } from '@/store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useThemeStore();

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme-storage');
        if (savedTheme) {
            try {
                const parsedTheme = JSON.parse(savedTheme);
                if (parsedTheme.state?.theme) {
                    setTheme(parsedTheme.state.theme);
                }
            } catch (error) {
                console.error('Error parsing saved theme:', error);
            }
        }
        if (!savedTheme) {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            setTheme(systemTheme);
        }
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme, setTheme]);

    return <>{children}</>;
}
