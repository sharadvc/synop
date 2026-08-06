<div align="center">
  <img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/landing.png" alt="Synop - AI YouTube Summarizer" width="100%" />

  <h1 align="center">Synop</h1>

  <p align="center">
    <strong>Extract High Signal from Noise in YouTube Videos</strong>
    <br />
    A free, open-source, locally-hostable AI tool to transform hour-long podcasts, lectures, and tutorials into dense, structured, actionable summaries.
  </p>

  <p align="center">
    <a href="#features">Features</a> •
    <a href="#screenshots">Screenshots</a> •
    <a href="#installation">Installation</a> •
    <a href="#architecture">Architecture</a>
  </p>
</div>

---

## Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>Landing Page</strong></td>
      <td align="center"><strong>Dashboard</strong></td>
    </tr>
    <tr>
      <td><img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/landing.png" alt="Landing Page" width="100%" /></td>
      <td><img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/dashboard.png" alt="Dashboard" width="100%" /></td>
    </tr>
    <tr>
      <td align="center"><strong>Dashboard (Full)</strong></td>
      <td align="center"><strong>Settings</strong></td>
    </tr>
    <tr>
      <td><img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/dashboard-full.png" alt="Dashboard Full" width="100%" /></td>
      <td><img src="https://raw.githubusercontent.com/sharadvc/synop/main/public/screenshots/settings.png" alt="Settings" width="100%" /></td>
    </tr>
  </table>
</div>

---

## Features

- **100% Free & Open Source**: Host Synop locally. No subscriptions, no paywalls.
- **Deep YouTube Summarization**: Extracts executive summaries, key insights, action items, quotes, timestamps, resources, bias analysis, verdict, and more.
- **Multi-format Export**: Download summaries as Markdown or PDF. Export to Notion (with your API key).
- **Content Repurposing**: Generate blog posts, Twitter threads, and LinkedIn posts from any video.
- **Chat with Any Video**: Ask questions about video content with context-aware AI chat (per-video or global search).
- **Folders & Organization**: Organize summaries into color-coded folders. Search, filter, and bulk-select for batch operations.
- **TTS Audio**: Listen to executive summaries with text-to-speech.
- **Video Clips**: AI-generated highlight reels with automated rendering (requires FFmpeg).
- **Bring Your Own Keys**: Use Gemini (free tier), Groq, or OpenRouter — swap from the UI settings.
- **Local Database**: Prisma + SQLite for zero-config persistence. All data stays on your machine.

## Quick Start (Localhost)

### Prerequisites
- Node.js 18+
- npm or pnpm
- API keys for your preferred AI model

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sharadvc/synop.git
   cd synop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Environment Variables**
   Copy `.env.example` to `.env` and add your API keys and master password:
   ```bash
   GEMINI_API_KEY="your_gemini_key"
   GROQ_API_KEY="your_groq_key"
   OPENROUTER_API_KEY="your_openrouter_key"
   MASTER_PASSWORD="your-secure-password"
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3456` to start summarizing.

### Optional: FFmpeg for Video Clips

If you want to use the clips/rendering feature:
```bash
brew install ffmpeg
```

## Architecture & Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + Glassmorphism UI
- **Database**: Prisma + SQLite
- **AI Models**: Gemini 1.5 Flash (primary), Groq Llama 3 (fallback), OpenRouter (fallback)
- **PDF Export**: html2pdf.js (rendered in isolated iframe)
- **Video Rendering**: Local FFmpeg + yt-dlp (clips feature)

## Contributing

Contributions are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
