# DocSight

Grounded document Q&A over SEC filings, with citations you can actually check.

Ask a question about a filing and get an answer with a computed confidence score and citations
that jump to the exact highlighted region of the source page. Every quoted span is verified
against the source text by code, not trusted from the model. A public benchmark page publishes
accuracy, citation validity and refusal rates per model, measured against a hand labelled gold set.

## How it works

1. **Extract** — pdf.js reads every word with its position on the page
2. **Chunk** — passages keep their page number and bounding box through every step
3. **Embed** — local embedding model fingerprints each passage (no API)
4. **Retrieve** — the question finds its most similar passages by vector search in the browser
5. **Answer** — the LLM answers only from those passages and must return the literal spans it used
6. **Verify** — code confirms each span exists in the source and maps it back to coordinates;
   spans that fail are flagged as unsupported
7. **Score** — confidence is composed from retrieval similarity, span verification rate and
   self consistency across samples

Inference runs on local Ollama during development and for eval runs. The deployed site is fully
static: pre-computed demo answers, embeddings shipped as files, in-browser retrieval, and a bring
your own key path for live queries. No server, no credentials, no running costs.

## Stack

Vite + React + TypeScript + Tailwind, react-router-dom, pdf.js, transformers.js, Vitest, oxlint,
Prettier. Pipelines in `scripts/` run locally with tsx.

## Commands

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm run dev`    | dev server                         |
| `npm run build`  | type check + production build      |
| `npm run test`   | unit tests                         |
| `npm run smoke`  | round trip against local Ollama    |
| `npm run ingest` | build the document index (phase 1) |
| `npm run eval`   | run the benchmark (phase 5)        |

## Roadmap

| Phase | Scope                                                              |
| ----- | ------------------------------------------------------------------ |
| 0     | Scaffold, provider interface, Ollama smoke test                    |
| 1     | Ingestion: extraction with coordinates, chunking, local embeddings |
| 2     | Q&A core: retrieve, prompt, structured answers with quoted spans   |
| 3     | Span verification and the PDF viewer with citation highlighting    |
| 4     | Composed confidence scoring                                        |
| 5     | Eval harness, gold set and the benchmark page                      |
| 6     | Pre-computed demo, BYOK path, deploy                               |
