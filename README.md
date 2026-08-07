<div align="center">
  <img src="/logo.svg" alt="Synop" width="64" height="64" />

  <h1 align="center">Synop</h1>

  <p align="center">
    <strong>Turn any YouTube video into a study deck, a research brief, or a shareable note.</strong>
    <br />
    Free · open source · bring-your-own-key. It reshapes itself around <em>who you are</em> — student, researcher, or creator.
  </p>

  <p align="center">
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#bring-your-own-keys">BYOK</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#license">License</a>
  </p>
</div>

---

## What is Synop?

Synop is a **persona-aware** YouTube-to-knowledge tool. Paste a link and it doesn't just summarize — it reshapes the output around your workflow:

- 🎓 **Student** → lecture notes, flashcards, quiz, spaced-repetition review, whole-course Anki exports
- 🔬 **Researcher** → dense, citation-grade summaries, claim fact-checking, bias analysis
- ✍️ **Creator** → quotable moments, resources, and frameworks you can repurpose

Every feature works even when the AI provider is down — deterministic fallbacks keep every tab showing real content.

## Features

### Persona-tailored content
On first run you pick who you are. The summaries, the tabs, and the default experience change to match — a student gets study material, a researcher gets a research dossier.

### 🧠 The Library (compounding knowledge base)
Search across every summary, browse a cross-video topic map that grows as you add videos, and **ask your whole library** a question. The more you summarize, the smarter it gets.

### 📬 Daily Briefing
One screen: new uploads from your watched channels + your recent library. A reason to open the app every day.

### 🎓 Study Mode
- **Flashcards** + **Quiz** built from the video's frameworks, topics, quotes, and critiques
- **Spaced-repetition Review** (SM-2 style, Again/Good/Easy) — kept in-app
- **Whole-course study**: paste a playlist → batch-summarize → one Anki deck across every lecture

### 🔬 Analysis (per video)
- **Semantic Topic Clusters** — content grouped by theme, not timestamp
- **Multi-Speaker Debate Matrix** — stances and points of contention
- **Freshness / Temporal Decay** — claims fact-checked against current data
- **Bias & Critique** — adversarial analysis of the creator's assumptions

### 📡 Channel Watchlist
Add your favorite channels. New uploads get **auto-summarized** into your library.

### 🔌 Bring Your Own Keys
No subscription. Add any OpenAI-compatible provider — OpenAI, DeepSeek, Groq, OpenRouter, a local Ollama server — with a live model picker. Fallbacks: OpenRouter → Groq → Gemini.

### 📤 Export
Markdown, PDF, or sync to **Obsidian** / **Notion** with `[[Wiki-Links]]`.

## Quick Start

### Prerequisites
- Node.js 18+
- An AI API key (see [BYOK](#bring-your-own-keys))

### Install & run
```bash
git clone https://github.com/sharadvc/synop.git
cd synop
npm install
npx prisma generate
npx prisma db push          # creates the SQLite database
cp .env.example .env.local  # add your keys
npm run dev
```

Open `http://localhost:3000`.

> The first time you open the dashboard you'll pick your persona. Change it anytime in **Settings → Your Role**.

## Bring Your Own Keys

Keys are entered in **Settings** and stored in your browser — nothing leaves your machine except the requests to your chosen provider.

| Provider | How to configure |
|---|---|
| **Custom (recommended)** | Settings → Custom AI Providers → paste any OpenAI-compatible base URL + key → **Fetch live models** → pick. Works with OpenAI, DeepSeek, Ollama, Together, OpenRouter, anything. |
| Gemini / Groq / OpenRouter | Settings → Bring Your Own Keys |
| YouTube Data API v3 | Required for reliable **playlist + channel** fetching. Free key from Google Cloud Console → set `YOUTUBE_API_KEY`. |

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4 + glassmorphism
- **Database**: Prisma + SQLite (local, zero-config)
- **AI**: any OpenAI-compatible endpoint, via a provider-fallback chain with deterministic no-LLM fallbacks
- **Persona engine**: prompt tailoring + per-persona summary storage + tab reordering

## Contributing

Contributions are welcome — docs, bug reports, features, translations.

1. Fork the project
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE).
