"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "synop_language";

interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "English",
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState("English");

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setLanguageState(saved);
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Also dispatch a storage event so other tabs/components react immediately
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: lang }));
  };

  // Listen for changes from other components (e.g. dashboard select changing it)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
