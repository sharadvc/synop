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

---

## TODO (next session)

### A. Deploy & turn accounts on (the big one)
1. **Host it** — Vercel (or Railway/Fly).
2. **Create a Postgres DB** — Supabase/Neon → `DATABASE_URL` on the host.
3. **Push schema**: `npm run db:push:pg`.
4. **Clerk app** → publishable + secret keys on the host. Auth turns ON automatically (code is wired).
5. **Verify multi-user**: sign in as 2 users → each sees only their own library; same video summarized by both stays separate.

### B. Move localStorage features to Postgres (cross-device sync)
- Course progress (`synop_course_*`), streaks (`synop_streak`), spaced-repetition schedules (`synop_review_*`) are browser-only. To sync across devices, persist them to the DB keyed by `userId` (new model(s) + the components read/write via API instead of localStorage).

### C. Open-source polish / self-hosting docs
- README "Self-hosting" section (SQLite zero-config vs Postgres multi-device, optional auth, keys).
- `Dockerfile` + `docker-compose.yml` (Postgres + app) for one-command self-hosting.

### D. Optional
- Public share links (`/share/[id]`) become truly shareable once deployed.
- Scheduled "auto-summarize" once there's an always-on server.

---

## Continuation prompt (paste this tomorrow)

> **Project:** `/Users/sharad007/synop-first-version` — Synop, an open-source MIT BYOK YouTube-to-knowledge app. Push to BOTH remotes after committing: `public` (`sharadvc/synop`, `master:main`) and `origin` (`sharadvc/synop-private`).
>
> **Rules:** (1) Do NOT add `Co-Authored-By` to commit messages — the user removed Claude from contributors. (2) Commit identity must stay `Sharad <264168532@users.noreply.github.com>`. (3) Keep it open-source friendly: localhost runs with zero config, auth is optional/key-gated, BYOK is the model. (4) Dev server on port 3001 (`npm run dev -p 3001`).
>
> **State:** App is feature-complete locally (SQLite). **userId isolation is DONE** — `Summary`/`Folder`/`ChannelWatch` have `userId`, all routes are scoped via `src/lib/user.ts` (`currentUserId()` + `userScope()`), open mode (no Clerk) verified working. Optional Clerk auth + Postgres schema are wired but untested (need real keys/DB).
>
> **Next session's goal — DEPLOY + make accounts live:**
> 1. Read PLAN.md (repo root) + `src/lib/user.ts` + the schema.
> 2. Walk the user through: creating a Supabase/Neon Postgres DB, a Clerk app, setting `DATABASE_URL` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`, pushing the Postgres schema, deploying to Vercel.
> 3. After deploy, TEST multi-user isolation: two accounts each see only their own data; the same video summarized by both stays separate.
> 4. Then move the localStorage features (course progress, streaks, review schedules) into Postgres keyed by userId so they sync across devices.
> 5. Add README "Self-hosting" section + optionally a Dockerfile.
>
> Start by confirming git is clean and the app builds, then guide the deploy (item 2).

---

## Dev notes
- `tsc` + `npm run build` must pass before committing.
- Playwright screenshots: `node scripts/screenshots.js` (needs server on :3001); outputs to `public/screenshots/` (referenced in README).
- If `.next/types` errors after adding/removing routes, `rm -rf .next` and rebuild.
- Hydration rule: never render `new Date()` (or anything time/locale-dependent) during SSR — use the `mounted` pattern.
- Env secrets live in `.env.local` (gitignored); `.env.example` documents them.
