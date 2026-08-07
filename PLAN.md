# Synop — Development Plan & Continuation Guide

> **Project:** [sharadvc/synop](https://github.com/sharadvc/synop) — open-source, MIT, BYOK YouTube-to-knowledge tool.
> **Repos:** public `sharadvc/synop` (main) · private backup `sharadvc/synop-private`.
> **Identity:** commits are authored as `Sharad <264168532@users.noreply.github.com>` (maps to the `sharadvc` GitHub account). **Do NOT add a `Co-Authored-By` trailer** — the user removed Claude from contributors by rewriting history.

---

## Current state (what's done)

A complete, working, persona-aware open-source app:

- **Personas** — Student / Researcher / Creator / General. Content + tab layout reshape per persona.
- **Core** — Summarize (OpenAI-compatible provider fallback: custom → OpenRouter → Groq → Gemini), deterministic no-LLM fallbacks so every feature always returns a result.
- **Library** — cross-video search, topic map, "ask your whole library."
- **Briefing** — daily landing, channel uploads, streak chip, review nudge.
- **Study Mode** — flashcards, quiz, spaced-repetition review (SM-2, localStorage), shareable decks.
- **Notebook** — handwritten-style notes (all personas), download as .md or PDF-as-seen.
- **Research Report** — detailed researcher dossier (claims, verification, bias, open questions).
- **Course progress** — playlist tracker (done / next-up / mastery %).
- **Channels** — watchlist with auto-summarize (YouTube Data API).
- **BYOK** — Settings → custom providers (any endpoint) with live model picker.
- **Data** — SQLite (Prisma) locally; `prisma/schema.postgres.prisma` ready for Postgres.

**Repos in sync at the latest commit.** Local dev: `npm run dev -p 3001` (saas-intel occupies :3000).

---

## Just done this session (ready but not fully testable)

### 1. Optional Clerk auth (key-gated)
- `@clerk/nextjs` re-added. `ClerkProvider` in `src/app/layout.tsx` wraps the app **only when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set**.
- `src/middleware.ts` protects `/dashboard`, `/playlist`, `/summary` **only when `CLERK_SECRET_KEY` is set**; otherwise passes through.
- `src/components/ClerkAuth.tsx` renders sign-in / user menu in the Navbar only when Clerk is active.
- **Localhost / self-hosted runs stay open (no auth).** Verified: builds + all pages 200 with no keys.

### 2. Postgres readiness
- `prisma/schema.postgres.prisma` — identical models, Postgres datasource (`env("DATABASE_URL")`).
- npm scripts: `npm run db:push:pg`, `npm run db:generate:pg`.
- `.env.example` documents `DATABASE_URL` + Clerk keys.
- **Not yet:** the models have **no `userId`**, so data isn't isolated per account yet (see next step).

---

## TODO (next session)

### A. Deploy & make accounts real (the big one)
1. **Host it** — Vercel (or Railway/Fly for the server). Requires the repo to build on the host.
2. **Create a Postgres DB** — Supabase (free) or Neon. Copy the connection string into `DATABASE_URL` on the host.
3. **Push the Postgres schema**: `npm run db:push:pg` on the host (or `prisma migrate`).
4. **Create a Clerk app** — get `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`, set on the host. Auth then turns ON automatically (the code is already wired).

### B. Multi-user data isolation & cross-device sync (required once auth is on)
Currently all users share the same SQLite/Postgres rows — fine for a single self-hosted user, but with Clerk accounts we must scope data per user:
1. Add `userId String?` to `Summary`, `Folder`, `ChannelWatch` (and optionally `SharedDeck`).
2. Filter every query in `/api/*` + `src/actions/*` by the Clerk `userId` (`getAuth()` from `@clerk/nextjs/server`).
3. Add a `userId` column + migration. This is what makes "sync across devices" real: sign in on any device → see the same library.
4. Local runs (no auth) fall back to a default user id so nothing breaks open.

### C. Open-source polish / self-hosting docs
- Add a **"Self-hosting"** section to README: SQLite (zero-config) vs Postgres (multi-device), optional auth, where to get keys.
- Consider `Dockerfile` + `docker-compose.yml` (Postgres + app) so people can self-host in one command — big for an open-source audience.

### D. Optional features (only after deploy works)
- Public share links already exist (`/share/[id]`) — they become truly shareable once deployed.
- Course progress, streaks, etc. are localStorage — to sync across devices, move them to the DB (Postgres) keyed by userId.
- Real "auto-summarize" (scheduled job) once there's an always-on server.

---

## Continuation prompt (paste this tomorrow)

> **Project:** `/Users/sharad007/synop-first-version` — Synop, an open-source MIT BYOK YouTube-to-knowledge app. Push to BOTH remotes after committing: `public` (`sharadvc/synop`, force-push `master:main` if needed) and `origin` (`sharadvc/synop-private`).
>
> **Rules:** (1) Do NOT add `Co-Authored-By` to commit messages — the user removed Claude from contributors. (2) Commit identity must stay `Sharad <264168532@users.noreply.github.com>`. (3) Keep it open-source friendly: localhost runs with zero config, auth is optional/key-gated, BYOK is the model. (4) The dev server runs on port 3001 (`npm run dev -p 3001`).
>
> **State:** App is feature-complete locally (SQLite). This session I added: optional Clerk auth (key-gated `ClerkProvider` + middleware + `ClerkAuth` navbar) and a Postgres-ready schema (`prisma/schema.postgres.prisma` + `DATABASE_URL` in `.env.example` + `db:push:pg` script). Auth is OFF without keys; Postgres is not yet used.
>
> **Next session's goal — MAKE ACCOUNTS + CROSS-DEVICE SYNC REAL:**
> 1. Check git status + the PLAN.md at the repo root.
> 2. Implement multi-user isolation: add `userId String?` to `Summary`, `Folder`, `ChannelWatch` (Prisma), and filter every `/api/*` route + `src/actions/*` by Clerk's `getAuth().userId` (fall back to a default id when auth is off).
> 3. Move the localStorage-only features (course progress, streaks) to Postgres keyed by userId so they sync across devices.
> 4. Guide the user through deploying: create a Supabase/Neon Postgres DB, a Clerk app, set env vars (`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), push the Postgres schema, and deploy to Vercel.
> 5. Add a README "Self-hosting" section + optionally a Dockerfile.
>
> Start by reading PLAN.md and the current schema, then implement item 2 (the userId isolation) first.

---

## Dev notes
- `tsc` + `npm run build` must pass before committing.
- Playwright screenshots: `node scripts/screenshots.js` (needs server on :3001); outputs to `public/screenshots/` (referenced in README).
- If `.next/types` errors after adding/removing routes, `rm -rf .next` and rebuild.
- Hydration rule: never render `new Date()` (or anything time/locale-dependent) during SSR — use the `mounted` pattern.
- Env secrets live in `.env.local` (gitignored); `.env.example` documents them.
