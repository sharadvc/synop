"use client";

/**
 * Build the BYOK headers for any AI request. Includes the user-configured
 * custom providers (stored in localStorage) so the server can try them first.
 */
export function aiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const providers = localStorage.getItem("custom_llm_providers") || "";
  return {
    "Content-Type": "application/json",
    "x-gemini-key": localStorage.getItem("gemini_key") || "",
    "x-groq-key": localStorage.getItem("groq_key") || "",
    "x-openrouter-key": localStorage.getItem("openrouter_key") || "",
    ...(providers ? { "x-custom-providers": providers } : {}),
    ...extra,
  };
}
