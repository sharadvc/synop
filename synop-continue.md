# Synop — Continuation Guide

> **Purpose:** everything needed to resume Synop from any future session with
> zero context. Read this first, then `PLAN.md` for deeper history.
> **Last updated:** 2026-08-08 — project folded/paused at v2.1.0.

---

## What Synop is

An open-source (MIT), **self-hosted, BYOK** YouTube-to-knowledge app. Paste a
YouTube video → get a persona-aware summary (Student / Researcher / Creator /
General), plus a cross-video **Library** ("ask your whole library"), **Study
Mode** (flashcards / quiz / spaced repetition), **Notebook**, **Research
Report**, **Course progress**, **Channel watchlist**, and exports
(Markdown / PDF / Obsidian / Notion). Every feature has a deterministic no-LLM
fallback so it always returns a result.

**Positioning (decided 2026-08-08):** a self-hosted open-source tool — **not** a
hosted multi-user SaaS. No accounts by default; auth (Clerk) + Postgres are
key-gated and dormant.

---

## Where everything lives

| Thing | Location |
|---|---|
| Local repo | `/Users/sharad007/synop-first-version` |
| Public remote | `public` → `https://github.com/sharadvc/synop.git` (branch `main`) |
| Private backup remote | `origin` → `https://github.com/sharadvc/synop-private.git` (branch `master`) |
| Latest release | `v2.1.0` (tag on both remotes) |

---

## Hard rules (never break)

1. **Commit identity must stay** `Sharad <264168532@users.noreply.github.com>`.
2. **NEVER add a `Co-Authored-By` trailer** — the user removed Claude from the
   project by rewriting history; do not reintroduce it.
3. **Push to BOTH remotes after every commit:**
   ```bash
   git push public master:main
   git push origin master
   ```
   (re-tag / re-push tags if a tag changed)
4. **Build gate:** `npx tsc --noEmit` and `npm run build` must pass before committing.
5. **Dev server on :3001** — `npm run dev -p 3001` (saas-intel occupies :3000).
6. **Hydration:** never render `new Date()` or locale/time-dependent values
   during SSR — use the `mounted` pattern.
7. If `.next/types` errors after adding/removing routes: `rm -rf .next` and rebuild.

---

## Status as of 2026-08-08 (folded)

- **Done:** feature-complete, released v2.1.0, README polished (Self-Hosting +
  Data & Privacy), solo-authored, git history unified to one identity (42
  commits, all `Sharad <264168532@users.noreply.github.com>`).
- **State:** project **folded/paused** — repos live but dormant. Do not develop
  further unless the user explicitly asks to resume.
- **Contributors:** GitHub's contributor graph may show `[]` or stale entries
  while GitHub recomputes after the history cleanup; it should settle to just
  Sharad. If it never does, the guaranteed fix is delete + recreate the repo
  (low cost — 0 stars, 1 fork, 0 issues).

---

## What's in place

- **Personas** — Student / Researcher / Creator / General; content + tab layout reshape per persona.
- **Core** — Summarize with provider fallback (custom → OpenRouter → Groq → Gemini) + deterministic no-LLM fallbacks.
- **Library** — cross-video search, topic map, "ask your whole library."
- **Briefing** — daily landing, channel uploads, streak chip, review nudge.
- **Study Mode** — flashcards, quiz, spaced-repetition (SM-2, localStorage), shareable decks.
- **Notebook** — handwritten-style notes, download as .md or PDF-as-seen.
- **Research Report** — researcher dossier (claims, verification, bias, open questions).
- **Course progress** — playlist tracker (done / next-up / mastery %).
- **Channels** — watchlist with auto-summarize (YouTube Data API).
- **BYOK** — Settings → custom providers (any OpenAI-compatible endpoint) with live model picker.
- **Security pass** — SSRF guard (`src/lib/net.ts` blocks private/metadata/localhost provider URLs; `ALLOW_LOCAL_PROVIDERS=true` opt-out) + 401 on unauthenticated writes (`requireUserId` in `src/lib/user.ts`).
- **Multi-user foundation (dormant)** — `userId` isolation on Summary/Folder/ChannelWatch; optional Clerk auth (key-gated); Postgres schema ready (`prisma/schema.postgres.prisma` + `npm run db:push:pg`).

---

## Data & keys

- Local runs: SQLite (`prisma/dev.db`), zero config. Optional Postgres via
  `DATABASE_URL` + `npm run db:push:pg` for cross-device sync.
- `.env.example` documents everything. `YOUTUBE_API_KEY` is required for
  playlist + channel watchlist fetching. AI keys are normally entered in the
  app (Settings → BYOK); server-side fallbacks via `OPENROUTER_API_KEY` /
  `GROQ_API_KEY` / `GEMINI_API_KEY`.
- Self-host **without Docker**: clone → `npm install` → `npx prisma db push`
  → `npm run build` → `npm run start` (port via `PORT`). Full guide in README
  "Self-Hosting".
- Screenshots for the README: `node scripts/screenshots.js` (needs server on
  :3001), outputs to `public/screenshots/`.

---

## If resuming — suggested next steps

1. Verify a fresh-clone production run: clone → install → `db push` → build →
   start → summarize a video → confirm the Library works.
2. Optional: cross-device sync — move browser-only features (course progress
   `synop_course_*`, streaks `synop_streak`, spaced-repetition `synop_review_*`)
   into Postgres keyed by `userId`.
3. Optional: scheduled "auto-summarize" on an always-on server.
4. Optional: confirm GitHub's contributor graph settled to just Sharad.

---

## Session-invariant facts (for future me)

- Do **not** add `Co-Authored-By`. Do **not** change the commit identity.
- Keep it open-source friendly: localhost zero-config, auth optional/key-gated,
  BYOK model.
- See `PLAN.md` (repo root) for the full dev history and prior continuation prompt.
