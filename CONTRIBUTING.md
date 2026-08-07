# Contributing to Synop

Thanks for contributing! Synop is a free, open-source, BYOK tool and every contribution helps.

## Getting started

1. Fork the repo and clone your fork.
2. `npm install`
3. `npx prisma generate && npx prisma db push`
4. `cp .env.example .env.local` — add an AI key (any OpenAI-compatible provider works).
5. `npm run dev` and open `http://localhost:3000`.

> The first time you open the dashboard you'll be asked to pick a persona — that's expected.

## Project layout

```
src/
  app/
    api/            # Next.js API routes (summarize, enrich, library, watchlist, …)
    dashboard/      # main UI (Briefing, Summaries, Library, Channels, Settings)
    playlist/[id]/  # course playlist → whole-course study
    summary/[id]/   # per-video analysis (Topics, Debate, Freshness, Study Mode)
  components/       # client components (BriefingPanel, LibraryPanel, ChannelsPanel, …)
  lib/
    ai.ts           # provider-fallback chain + custom provider support
    persona.ts      # the persona system (student/researcher/creator/general)
    phase2/         # enrichment features + deterministic fallbacks
    playlist.ts     # playlist fetching (YouTube Data API + scraper fallback)
prisma/schema.prisma
```

## Key design decisions (read before changing)

- **Personas**: content and tab order are driven by `src/lib/persona.ts`. Add a persona by adding an entry there; keep `hiddenTabs` minimal.
- **Always show a result**: every enrichment feature has a deterministic fallback (`phase2/*`). Don't introduce a feature that can return a blank/error state when AI providers are down.
- **BYOK**: never hardcode a provider. New AI calls go through `src/lib/ai.ts` (`llmJson` / `callCustomProvider`) or the summarize fallback chain.
- **No auth by design**: this is a local-first, single-user BYOK tool. Don't add server-side user accounts without a maintainer discussion.

## Pull requests

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your change, keeping it scoped.
3. Run `npx tsc --noEmit` and `npm run build` — both must pass.
4. Open a PR with a clear description of what and why.

## Reporting bugs

Open an issue with: what you did, what you expected, what happened, and (if relevant) the AI provider you're using. Screenshots help.

## Code of Conduct

Please be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
