# CLAUDE_GOTCHAS.md

Common mistakes and non-obvious conventions to avoid repeating. Add entries as they happen; keep
them short.

---

## Dense-only retrieval misranks financial tables

MiniLM cosine similarity alone put Apple's R&D expense chunk (index 126, page 36, the exact
answer) below unrelated finance-dense chunks for the query "How much did Apple spend on research
and development?". The extraction was correct; the ranking was not. Phase 2 retrieval must be
hybrid: lexical keyword scoring (BM25 style) combined with the dense score, not dense alone.

## pdfjs-dist v6 API differences

`PDFDocumentProxy.destroy()` no longer exists — keep the loading task from `getDocument()` and
call `loadingTask.destroy()`. `content.items` needs an `unknown[]` cast before a custom type
guard because the union with `TextMarkedContent` will not narrow through `.filter()`.

## tsx outside the package compiles as CJS

Scripts run from outside the repo (scratchpad checks) hit "Top-level await is currently not
supported with the cjs output format" — wrap them in an async main instead of top-level await.
