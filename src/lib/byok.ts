"use client";

// BYOK config, persisted to localStorage on the client. Keys never leave the
// browser except in the summarize request (localhost app → its own API).

import type { Provider } from "@/lib/providers";

export type ProviderKeys = Record<Provider, string>;

export interface ByokConfig {
  provider: Provider;
  keys: ProviderKeys;
}

const STORAGE_KEY = "synop_byok";

const DEFAULT_KEYS: ProviderKeys = {
  openrouter: "",
  groq: "",
  deepseek: "",
  openai: "",
};

export function getByokConfig(): ByokConfig {
  const fallback: ByokConfig = { provider: "deepseek", keys: DEFAULT_KEYS };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const provider: Provider = ["openrouter", "groq", "deepseek", "openai"].includes(parsed?.provider)
      ? parsed.provider
      : "deepseek";
    return { provider, keys: { ...DEFAULT_KEYS, ...(parsed?.keys ?? {}) } };
  } catch {
    return fallback;
  }
}

export function setByokConfig(cfg: ByokConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/** True when at least one key has been saved. */
export function hasAnyKey(cfg: ByokConfig): boolean {
  return Object.values(cfg.keys).some((k) => !!k.trim());
}
