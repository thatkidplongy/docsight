# DocSight

Document intelligence engine over SEC filings: grounded Q&A with span verified citations, computed
confidence scores, and a published eval. Personal project; everything runs free (local Ollama for
inference, local embeddings, static deploy on Vercel).

Baseline coding standards live in `~/Develop/CLAUDE.md`. Project rules in `CONVENTIONS.md` take
precedence. Record repeated mistakes in `CLAUDE_GOTCHAS.md`.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — type check + production build
- `npm run test` — Vitest, colocated `*.test.ts` files under src/
- `npm run lint` / `npm run format` — oxlint / Prettier
- `npm run smoke` — round trip against local Ollama (`brew services start ollama` if down)
- `npm run ingest` — phase 1 pipeline (filings → chunks with coordinates → embeddings → data/)
- `npm run eval` — phase 5 harness (gold set → per model scores → data/results/)

## Architecture

- `src/` — the web app (two routes: `/` demo, `/benchmark`). Deployed as a static site; retrieval
  runs in the browser over embedding files shipped from `data/`.
- `scripts/` — Node pipelines run locally via tsx. Never imported by the web app.
- `data/` — filings, chunk index, embeddings, gold set, eval results. Generated artifacts; the
  deployable subset is committed so the site needs no backend.
- `src/lib/providers/` — ALL model access goes through the `Provider` interface. Nothing else in
  the codebase may call a model API directly.
- `src/lib/types.ts` — the core contracts (`Chunk`, `SpanCitation`, `ConfidenceBreakdown`,
  `Answer`). Provenance (page + bbox) must survive every transformation from extraction to render.

## Phase status

| Phase | Scope                                                                     | Status |
| ----- | ------------------------------------------------------------------------- | ------ |
| 0     | Scaffold, provider interface, Ollama smoke test                           | done   |
| 1     | Ingestion: pdf.js extraction with coordinates, chunking, local embeddings | todo   |
| 2     | Q&A core: retrieve → prompt → structured answer with quoted spans         | todo   |
| 3     | Span verification + PDF viewer with citation highlighting                 | todo   |
| 4     | Composed confidence scoring                                               | todo   |
| 5     | Eval harness, gold set, benchmark page                                    | todo   |
| 6     | Pre-computed demo answers, BYOK path, deploy                              | todo   |

## Hard rules

- No API keys, secrets, or paid services anywhere in this repo — the deployed site holds no
  credentials. Visitor BYOK keys stay in browser memory only (never localStorage, never sent to
  our infrastructure).
- Nothing from BYB / platform-agentic (package names, service names, URLs, copy) may appear here.
- Model answers are never trusted: every quoted span is verified against source text before it is
  shown as a citation, and confidence is computed from signals, not self reported.
