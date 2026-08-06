# Synop — first version (YouTube Summary AI)

The original synop: paste a YouTube link, get a dense, structured AI summary —
executive summary, key insights, action items, quotes, chapter timestamps, and a verdict.

Clerk auth has been **muted for local dev** (no sign-in required, fixed `dev-user`).

## Run it

```bash
npm install
npm run dev
# → http://localhost:3456
```

## Bring Your Own Key (BYOK)

Summarization runs on **your** AI key. Open **Settings → Bring Your Own Key**, pick a
provider, paste a key, save. Keys live in your browser's `localStorage` and are sent only
to this app's `/api/summarize` endpoint.

Supported providers (strictly free where marked):

| Provider      | Models                                                        | Cost       |
| ------------- | ------------------------------------------------------------- | ---------- |
| OpenRouter    | Only `:free` models, pulled live from OpenRouter's catalog    | Free       |
| Groq          | Free-tier allowlist (llama-3.3-70b-versatile, llama-3.1-8b-instant, …) | Free |
| DeepSeek      | `deepseek-chat` / `deepseek-reasoner`                         | Paid (yours) |
| OpenAI        | `gpt-4o-mini` family                                          | Paid (yours) |

> **OpenRouter note:** free (`:free`) models still require a small credit balance
> (≈$0.01) on your OpenRouter account before they'll respond.

### Env fallback

Keys entered in Settings are primary. As a fallback, these env vars are used when a request
carries no key: `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`.
Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are only needed if you use the
`/api/webhook/stripe` route.

## Stack

- Next.js 16 (App Router, Turbopack)
- SQLite via Prisma (`prisma/dev.db` committed)
- Tailwind CSS v4
