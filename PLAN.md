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

### 1. Multi-user userId isolation (DONE, auth-off tested)
- Added `userId String?` to `Summary`, `Folder`, `ChannelWatch` (both schemas) + migrated.
- `Summary` unique constraint now `(videoId, language, persona, userId)`; `ChannelWatch` unique now `(channelId, userId)` — so different users can each watch/summarize the same videos.
- `src/lib/user.ts`: `currentUserId()` (Clerk `getAuth`/`auth`, falls back to `'local'` when auth is off) + `userScope()` (Prisma `{ OR: [{ userId: uid }, { userId: null }] }` so legacy rows stay visible).
- Scoped **every** read/write in `src/actions/*` + `/api/*` (summarize, enrich, library, watchlist, notes, research, chat, exports, delete) by userId.
- **Verified in open mode** (no Clerk keys): build passes, all pages 200, library still lists all 9 videos, watchlist add/list/delete works.
- **Not yet testable:** the Clerk-authenticated path (needs real Clerk keys + a signed-in user).

### 2. Optional Clerk auth (key-gated)
- `ClerkProvider` in layout + auth middleware (protects dashboard/playlist/summary) + `ClerkAuth` navbar — active only when keys set. Localhost stays open.

### 3. Postgres readiness
- `prisma/schema.postgres.prisma` + `DATABASE_URL` + `db:push:pg`/`db:generate:pg` scripts.

### 4. Security pass before accounts go live (DONE, build verified)
- **SSRF protection** — new `src/lib/net.ts`: `safeProviderBaseUrl()` rejects custom-provider base URLs that are private ranges (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, 100.64/10), cloud metadata (169.254.169.254, 100.100.100.200, metadata.google.internal, …), localhost, or that resolve (via `dns.lookup`) to any private IP — also defeats DNS rebinding. Cached so hot LLM loops don't re-resolve. Wired into `callCustomProvider` (`ai.ts`) and the `/api/providers/models` probe. Self-hosters with local models can opt out with `ALLOW_LOCAL_PROVIDERS=true`.
- **401 on unauthenticated writes** — `currentUserId()` now returns `string | null`; `requireUserId()` returns `'local'` in open mode, or null when Clerk is on but the request is unauthenticated. All 12 mutating API routes (`summarize`, `enrich`, `chat`, `notes`, `research`, `export/*`, `share/deck`, `watchlist`, `watchlist/check`, `summary/[id]`, `providers/models`) now `if (!uid) return 401` instead of falling back to the shared `'local'` bucket — so no cross-user writes when accounts are on. Reads still `userScope()` (this user + legacy null rows). Middleware already gates `/dashboard`, `/playlist`, `/summary` pages.
- Verified: `tsc --noEmit` clean, `npm run build` clean. Open mode (no Clerk) still works (everything 401s through to `'local'`).

### 5. Self-hosting docs (DONE — no Docker)
- Docker was tried then **removed** (2026-08-08): the owner wants self-hosting to require **no Docker**. `.dockerignore`, `Dockerfile`, `docker-compose.yml` deleted; README section rewritten.
- README "Self-Hosting" section: direct Node run (clone → `npm install` → `npx prisma db push` → `npm run build` → `npm run start`), SQLite default (one file, `prisma/dev.db`), optional Postgres via `DATABASE_URL` + `npm run db:push:pg`, keys table, optional-auth note, process-manager tip.
- Keep the project dependency-light — no containerization, no added deps.

---

## TODO (next session)

> **Direction (2026-08-08):** Synop is a **self-hosted open-source tool**, not a hosted multi-user app. The deploy-with-accounts path is dropped. Auth + Postgres stay in the code but dormant/key-gated. Goal: a simple, **no-Docker** self-host experience.

### A. ~~Deploy & turn accounts on~~ — dropped (self-hosting pivot)
Keep Clerk + Postgres dormant. Revisit only if a public multi-user instance is ever wanted.

### B. (done) Self-hosting docs (no Docker)
- README "Self-Hosting" section: direct Node run, SQLite default, optional Postgres, keys, optional auth.
- Decision: **no Docker** — self-hosting must not require it.

### C. Optional — cross-device sync (only with Postgres self-host)
- Course progress (`synop_course_*`), streaks (`synop_streak`), spaced-repetition schedules (`synop_review_*`) are browser-only. Persist them to the DB keyed by `userId` (new model(s) + the components read/write via API instead of localStorage) so data follows you between devices.

### D. Optional
- Scheduled "auto-summarize" — Docker now gives an always-on server option.
- Share links (`/share/[id]`) work per-instance as-is.

---

## Continuation prompt (paste this tomorrow)

> **Project:** `/Users/sharad007/synop-first-version` — Synop, an open-source MIT BYOK YouTube-to-knowledge app. Push to BOTH remotes after committing: `public` (`sharadvc/synop`, `master:main`) and `origin` (`sharadvc/synop-private`).
>
> **Rules:** (1) Do NOT add `Co-Authored-By` to commit messages — the user removed Claude from contributors. (2) Commit identity must stay `Sharad <264168532@users.noreply.github.com>`. (3) Keep it open-source friendly: localhost runs with zero config, auth is optional/key-gated, BYOK is the model. (4) Dev server on port 3001 (`npm run dev -p 3001`).
>
> **State:** App is feature-complete locally (SQLite). **userId isolation is DONE** — `Summary`/`Folder`/`ChannelWatch` have `userId`, all routes are scoped via `src/lib/user.ts` (`currentUserId()` + `userScope()`), open mode (no Clerk) verified working. Optional Clerk auth + Postgres schema are wired but untested (need real keys/DB). **Security pass is DONE too** — SSRF protection for custom provider URLs (`src/lib/net.ts`) + 401 on unauthenticated writes via `requireUserId()`.
>
> **Next session's goal — polish the self-hosted experience:**
> 1. Read PLAN.md for the pivot: Synop is a **self-hosted open-source tool** — no hosted accounts. Auth/Postgres code stays dormant & key-gated.
> 2. Verify a fresh-clone production run: clone → `npm install` → `npx prisma db push` → `npm run build` → `npm run start`, open http://localhost:3000, summarize a video, confirm the library works.
> 3. Confirm `tsc` + `npm run build` pass and git is clean before any commit.
> 4. Optional: move browser-only features (course progress, streaks, review schedules) into Postgres keyed by `userId` for cross-device sync.
>
> Start by confirming git is clean and the app builds.

---

## Dev notes
- `tsc` + `npm run build` must pass before committing.
- Playwright screenshots: `node scripts/screenshots.js` (needs server on :3001); outputs to `public/screenshots/` (referenced in README).
- If `.next/types` errors after adding/removing routes, `rm -rf .next` and rebuild.
- Hydration rule: never render `new Date()` (or anything time/locale-dependent) during SSR — use the `mounted` pattern.
- Env secrets live in `.env.local` (gitignored); `.env.example` documents them.
