<div align="center">
  <img src="public/logo.svg" alt="Synop" width="72" height="72" />

  <h1 align="center">Synop</h1>

  <p align="center">
    <strong>Your YouTube watch-time, turned into a study deck, a research brief, or a shareable note.</strong>
    <br />
    A persona-aware AI tool that reshapes every video around <em>who you are</em> — student, researcher, or creator.
  </p>

  <p align="center">
    <a href="https://github.com/sharadvc/synop/releases"><img src="https://img.shields.io/badge/version-2.1.0-blue" alt="Version 2.1.0" /></a>
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
    <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/stack-OpenAI--compatible-purple" alt="Any OpenAI-compatible provider" />
    <img src="https://img.shields.io/badge/PRs-welcome-orange" alt="PRs welcome" />
    <img src="https://img.shields.io/github/stars/sharadvc/synop" alt="GitHub stars" />
  </p>

  <p align="center">
    <strong>100% free · open source · bring your own key · runs entirely on your machine</strong>
  </p>
</div>

---

## Why Synop?

Most "YouTube summarizers" give everyone the same generic summary. Synop doesn't.

**It asks who you are — then reshapes everything around your job:**

| 🎓 Student | 🔬 Researcher / Analyst | ✍️ Creator / Writer |
|---|---|---|
| Lecture notes, flashcards, quiz, spaced-repetition review | Citation-grade dossiers, claim fact-checking, bias analysis | Quotable moments, resources, and mental models to repurpose |
| Whole-course playlists → one Anki deck | Obsidian/Notion sync with `[[Wiki-Links]]` | Clean markdown/PDF exports |
| The summaries themselves are written in study-tutor style | The summaries are written in research-analyst style | The summaries surface the sharable gold |

The content isn't just reordered — **the AI writes differently per persona**.

And because it's built for reliability: **every feature works even when AI providers are down**, with deterministic fallbacks that always show a real result.

---

## Screenshots

| | |
|---|---|
| **Landing** | **Daily Briefing** |
| <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/landing.png" width="100%" /> | <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/dashboard-briefing.png" width="100%" /> |
| **Summaries library** | **The Library — cross-video knowledge base** |
| <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/dashboard-summaries.png" width="100%" /> | <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/dashboard-library.png" width="100%" /> |
| **Channel watchlist** | **Settings — BYOK & custom providers** |
| <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/dashboard-channels.png" width="100%" /> | <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/dashboard-settings.png" width="100%" /> |
| **Video analysis (Topics)** | **Notebook — handwritten study notes** |
| <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/summary.png" width="100%" /> | <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/notebook.png" width="100%" /> |
| **Study Mode (flashcards + review)** | **Research Report (researchers)** |
| <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/study-mode.png" width="100%" /> | <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/research-report.png" width="100%" /> |
| **Course progress (playlists)** | |
| <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/course-tracker.png" width="100%" /> | |

---

## Features

### 🧠 The Library — a compounding knowledge base
Every summary you add grows a searchable library: a **cross-video topic map**, full-text search across everything, and **"ask your whole library"** — LLM synthesis over all your videos. The more you use it, the smarter it gets.

### 📬 Daily Briefing
One screen every morning: new uploads from your watched channels + your recent library. A reason to open the app.

### 🎓 Study Mode
- **Flashcards** + **Quiz** built from the video's frameworks, topics, quotes, and critiques
- **Spaced-repetition Review** (SM-2 style: Again / Good / Easy) — kept in-app, no export needed
- **Whole-course study**: paste a playlist → batch-summarize every lecture → one Anki deck across the course

### 🔬 Per-video analysis
- **Semantic Topic Clusters** — content grouped by theme, not timestamp
- **Multi-Speaker Debate Matrix** — each speaker's stance and points of contention
- **Freshness / Temporal Decay** — claims fact-checked against current data
- **Bias & Critique** — adversarial analysis of the creator's assumptions

### 📡 Channel Watchlist
Follow your favorite channels — new uploads are **auto-summarized** into your library.

### 🔌 Bring Your Own Keys
No subscription, no account, no server. Add **any OpenAI-compatible provider** — OpenAI, DeepSeek, Groq, OpenRouter, or a local Ollama server — with a **live model picker** that fetches the real model list. Fallback chain: custom → OpenRouter → Groq → Gemini.

### 📤 Export
Markdown, PDF, or sync to **Obsidian** / **Notion** with auto-generated `[[Wiki-Links]]`.

---

## Quick Start

```bash
git clone https://github.com/sharadvc/synop.git
cd synop
npm install
npx prisma generate
npx prisma db push        # creates the SQLite database
cp .env.example .env.local  # add your AI key
npm run dev
```

Open **http://localhost:3000** — the first time you enter the dashboard you'll pick your persona.

> **Requirements:** Node.js 18+, and an AI API key. The easiest path is OpenRouter (free models) or any OpenAI-compatible key — see below.

### Add an AI key (BYOK)

| Where | What |
|---|---|
| **Settings → Custom AI Providers** | Paste any OpenAI-compatible base URL + key → **Fetch live models** → pick. Works with OpenAI, DeepSeek, Ollama, Together, OpenRouter, anything. |
| **Settings → Bring Your Own Keys** | Gemini / Groq / OpenRouter keys |
| **`YOUTUBE_API_KEY`** | Free YouTube Data API v3 key — required for reliable **playlist** and **channel watchlist** fetching. |

Keys are stored in your browser's local storage and sent per-request — nothing else leaves your machine.

---

## Data & Privacy

- **Local-first.** Everything lives in a local SQLite database (`prisma/dev.db`) — summaries, notes, library, watchlist, folders. There is no Synop server; your data never leaves your machine.
- **Your keys stay yours.** AI keys are stored in your browser (localStorage) and sent straight to the provider you chose, per request.
- **Safe by default.** Custom provider URLs are checked against private / metadata / localhost addresses (SSRF guard), so Synop can't be pointed at your internal network. Self-hosters running a local LLM (e.g. Ollama) opt in with `ALLOW_LOCAL_PROVIDERS=true`.

---

## Self-Hosting

Synop runs anywhere Node.js does — a home server, a Raspberry Pi, a VPS. No Docker required.

```bash
git clone https://github.com/sharadvc/synop.git
cd synop
npm install
npx prisma db push        # creates the SQLite database (prisma/dev.db)
npm run build
npm run start             # production server → http://localhost:3000
```

Set `PORT` to change the port (e.g. `PORT=8080 npm run start`).

**Keep it running.** `npm run start` runs in the foreground. For an always-on instance, run it under a process manager, e.g. with pm2:

```bash
npx pm2 start "npm run start" --name synop
npx pm2 save
```

**Postgres (optional).** Local runs use SQLite — zero-config, one file you can back up (`prisma/dev.db`). To sync across devices or run multi-user, point it at Postgres instead: set `DATABASE_URL` in `.env` and run `npm run db:push:pg` once before starting.

**Keys.** Most people just paste keys in the app (Settings → BYOK). The only key the *server* needs up front is `YOUTUBE_API_KEY`, for fetching playlists and channel watchlists:

| Variable | Needed for |
|---|---|
| `YOUTUBE_API_KEY` | Playlist + channel watchlist fetching (free from Google Cloud Console) |
| `OPENROUTER_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY` | Optional server-side AI fallback (BYOK in Settings still works) |
| `ALLOW_LOCAL_PROVIDERS=true` | Only if you run a local LLM (e.g. Ollama) and want to reach it |
| `PORT` | Web port (default 3000) |

**Accounts are optional.** A self-hosted single-user instance needs no auth — the app is fully open by default. Only set the Clerk keys if you ever plan to expose a *public* multi-user instance.

---

## Tech Stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **Styling** — Tailwind CSS v4, glassmorphism UI
- **Database** — Prisma + SQLite (local, zero-config)
- **AI** — any OpenAI-compatible endpoint via a provider-fallback chain, with deterministic no-LLM fallbacks so every feature always returns a result
- **Persona engine** — prompt tailoring + per-persona summary storage + persona-specific tab layouts

## Roadmap

- [x] Persona-tailored content (student / researcher / creator)
- [x] Cross-video Library + "ask your whole library"
- [x] Spaced-repetition review in-app
- [x] Channel watchlist with auto-summarize
- [x] Custom AI providers (any endpoint)
- [x] Streaks & daily review nudge
- [x] Course progress tracking (lectures done, next-up, mastery)
- [x] Shareable study decks
- [x] Self-hosting (direct Node run — no Docker, SQLite or Postgres, optional accounts)

## Contributing

Contributions are welcome — bugs, docs, features, translations. See [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE).
