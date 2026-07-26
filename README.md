<div align="center">
  <br/>
  <a href="https://github.com/sharadvc/synop">
    <img src=".github/social-preview.svg" alt="Synop — AI Video Summarizer" width="800">
  </a>
  <br/>
  <h1>Synop</h1>
  <p><strong>AI Video Summarizer. Free. Open Source. Private.</strong></p>
  <p>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"/></a>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/built%20with-Next.js%2016-black" alt="Next.js 16"/></a>
    <a href="https://github.com/sharadvc/synop/stargazers"><img src="https://img.shields.io/github/stars/sharadvc/synop?style=flat&color=c8f04e" alt="GitHub Stars"/></a>
    <a href="https://github.com/sharadvc/synop/issues"><img src="https://img.shields.io/github/issues/sharadvc/synop?style=flat&color=94a3b8" alt="GitHub Issues"/></a>
  </p>
  <p>
    <b>100% free</b> ·
    <b>Open source</b> ·
    <b>No signup required</b> ·
    <b>Privacy first</b>
  </p>
  <br/>
</div>

---

## ✦ What is Synop?

**Synop** turns any YouTube video into a structured, AI-powered summary in seconds. Paste a link — get a TL;DR, key insights, action items, timestamps, quotes, resources, and a verdict.

No signup. No paywall. No tracking. No data collection.

Built for students, professionals, researchers, and content creators who want the substance without the watch time.

---

## ✦ Why Synop?

| | Why it's different |
|---|---|
| 🆓 | **Completely free** — no credits, no limits, no "upgrade to pro" |
| 🔓 | **Fully open source** — MIT license. Self-host. Modify. Share. |
| 🔒 | **Privacy first** — transcripts processed securely, never stored |
| ⚡ | **Instant** — most summaries in under 30 seconds |
| 🌐 | **Multi-language** — works with any language YouTube video |
| 📦 | **Exportable** — copy, PDF, Markdown |

---

## ✦ Features

- **AI-Powered Summaries** — structured output with TL;DR, insights, action items, quotes, timestamps, resources, verdict
- **Smart Extraction** — key quotes automatically surfaced, no searching through hours of content
- **Timestamps** — jump to any topic in the video instantly
- **Action Items** — extract actionable takeaways
- **Multi-language** — works with videos in any language
- **Responsive UI** — dark mode, works on every device
- **Dashboard** — track your summary history
- **Export** — copy to clipboard, PDF, Markdown

---

## ✦ Tech Stack

```
Runtime     → Next.js 16 (App Router, Turbopack)
Language    → TypeScript
Database    → SQLite (via Prisma)
Auth        → Clerk
Payments    → Stripe
AI          → OpenRouter / OpenAI SDK
UI          → Tailwind CSS v4, shadcn/ui, Framer Motion
Fonts       → Inter + Instrument Serif
```

---

## ✦ Quick Start

```bash
git clone https://github.com/sharadvc/synop.git
cd synop
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste a YouTube link.

### Environment Variables

```env
# Clerk (https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx

# OpenRouter or OpenAI
OPENROUTER_API_KEY=sk-or-xxx

# Stripe (optional)
STRIPE_SECRET_KEY=sk_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## ✦ How It Works

```
Paste URL → Extract video ID → Fetch transcript
  → AI analysis → Structured summary
  → TL;DR · Insights · Actions · Quotes · Timestamps · Verdict
```

1. **Extract** — Parse video ID from any YouTube URL format
2. **Transcribe** — Fetch transcript via `youtube-transcript`
3. **Clean** — Remove noise markers, normalize whitespace
4. **Analyze** — LLM produces structured JSON output
5. **Render** — Beautiful tabbed UI with all sections

---

## ✦ Project Structure

```
src/
├── app/
│   ├── api/summarize/     # POST — processes YouTube video → summary
│   ├── dashboard/         # User dashboard with history
│   ├── summary/[id]/      # Summary detail page
│   ├── settings/          # User settings
│   ├── sign-in/           # Clerk sign-in
│   ├── sign-up/           # Clerk sign-up
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Tailwind + shadcn theme
├── components/
│   ├── Navbar.tsx         # Navigation
│   └── ui/                # shadcn/ui components
└── lib/
    ├── youtube.ts         # YouTube transcript extraction
    ├── summarizer.ts      # Transcript cleaning
    └── utils.ts           # Shared helpers
```

---

## ✦ Deployment

### Vercel (Recommended — Free)

```bash
npm i -g vercel
vercel
```

### Docker

```bash
docker build -t synop .
docker run -p 3000:3000 synop
```

---

## ✦ Roadmap

- [x] YouTube transcript extraction
- [x] AI-powered structured summaries
- [x] Dashboard with history
- [x] Clerk authentication
- [ ] Podcast support (Spotify, Apple)
- [ ] Browser extension
- [ ] Team workspaces
- [ ] Public API

---

## ✦ Contributing

This is an open source project and we welcome contributions of all kinds.

```bash
git checkout -b feature/your-feature
npm run dev
# make changes
npm run build
git push origin feature/your-feature
```

Then open a pull request. All skill levels welcome.

---

## ✦ License

MIT © [sharadvc](https://github.com/sharadvc) — Free to use, modify, and distribute.

---

<div align="center">
  <p>
    <a href="https://github.com/sharadvc/synop">GitHub</a>
    ·
    <a href="https://github.com/sharadvc/synop/issues">Issues</a>
    ·
    <a href="https://github.com/sharadvc/synop/discussions">Discussions</a>
  </p>
  <p>
    <sub>Built with ❤️ for the open source community</sub>
  </p>
</div>
