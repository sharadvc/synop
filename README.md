<div align="center">
  <img src="public/logo.svg" alt="Synop" width="72" height="72" />

  <h1 align="center">Synop</h1>

  <p align="center">
    <strong>Your YouTube watch-time, turned into a study deck, a research brief, or a shareable note.</strong>
    <br />
    A persona-aware AI tool that reshapes every video around <em>who you are</em> — student, researcher, or creator.
  </p>

  <p align="center">
    <a href="https://github.com/sharadvc/synop/releases"><img src="https://img.shields.io/badge/version-2.0.0-blue" alt="Version 2.0.0" /></a>
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
| **Video analysis (Topics)** | **Study Mode (flashcards)** |
| <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/summary.png" width="100%" /> | <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/study-mode.png" width="100%" /> |

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
- [ ] Streaks & daily review nudge
- [ ] Course progress tracking (lectures done, next-up, mastery)
- [ ] Shareable public study decks
- [ ] Self-hosted sync / optional accounts

## Contributing

Contributions are welcome — bugs, docs, features, translations. See [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE).
