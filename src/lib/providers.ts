// Shared provider constants (used by both server AI layer and client UI).
// Kept in its own module so client bundles don't import the server AI layer.

export type Provider = 'openrouter' | 'groq' | 'deepseek' | 'openai';

export const PROVIDERS: Provider[] = ['openrouter', 'groq', 'deepseek', 'openai'];

export const PROVIDER_LABELS: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
};
