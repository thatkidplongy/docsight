import { useEffect, useState } from 'react';
import type { Answer, SpanCitation } from '../lib/types';
import type { Bbox } from '../lib/pipeline/geometry';
import type { Provider } from '../lib/providers/provider';
import { OllamaProvider } from '../lib/providers/ollama';
import { GeminiProvider } from '../lib/providers/gemini';
import { askQuestion } from '../lib/qa/ask';
import { useManifest } from '../lib/hooks/useManifest';
import { useDocumentIndex } from '../lib/hooks/useDocumentIndex';
import { useDemoItems } from '../lib/hooks/useDemoItems';
import DocumentPicker from '../components/Demo/DocumentPicker';
import QuestionForm from '../components/Demo/QuestionForm';
import AnswerCard from '../components/Demo/AnswerCard';
import PdfViewer from '../components/Demo/PdfViewer';
import ProviderPicker, { type ProviderChoice } from '../components/Demo/ProviderPicker';
import SuggestedQuestions from '../components/Demo/SuggestedQuestions';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/Demo/states';

/**
 * One state rather than three: an answer, an error and a progress label are
 * mutually exclusive, so a union makes the invalid combinations unrepresentable
 * instead of relying on every transition to clear the other two.
 */
type AskState =
  | { kind: 'idle' }
  | { kind: 'embedding' }
  | { kind: 'asking' }
  | { kind: 'answered'; answer: Answer }
  | { kind: 'error'; message: string };

const BUSY_LABELS: Partial<Record<AskState['kind'], string>> = {
  embedding: 'Embedding your question in the browser (first ask downloads a small model)...',
  asking: 'Asking the model...',
};

const IDLE_HINT =
  'Click a question above to see it work. The answer arrives with a quoted citation; click that citation and the viewer jumps to the exact source region on the page.';

/**
 * Visitors on the deployed site have no local Ollama, so defaulting to it
 * guarantees their first live ask fails. Local development keeps Ollama.
 */
const DEFAULT_PROVIDER_CHOICE: ProviderChoice =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? { kind: 'ollama' }
    : { kind: 'gemini', apiKey: '' };

const buildProvider = (choice: ProviderChoice): Provider => {
  if (choice.kind === 'gemini') return new GeminiProvider({ apiKey: choice.apiKey });

  return new OllamaProvider();
};

const buildAskErrorHint = (choice: ProviderChoice): string => {
  if (choice.kind === 'ollama') {
    return ' Live asking with the local option needs Ollama running on your machine; try a suggested question above, or add a Gemini key under Model settings.';
  }

  if (!choice.apiKey.trim()) {
    return ' Add a free Gemini key under Model settings (aistudio.google.com), or click a suggested question above.';
  }

  return '';
};

const findFirstVerified = (answer: Answer): SpanCitation | undefined =>
  answer.citations.find(citation => citation.verified);

const IntroHeader = () => (
  <header className="mb-8 max-w-3xl">
    <h1 className="text-3xl font-semibold text-white">Ask a filing. Get an answer with proof.</h1>
    <p className="mt-3 leading-relaxed text-neutral-400">
      DocSight answers questions about real SEC filings and backs every claim with a citation, checked against the
      document by code rather than trusted from the model.
    </p>
    <ol className="mt-4 flex flex-col gap-2 text-sm text-neutral-400 sm:flex-row sm:gap-8">
      <li>
        <span className="font-semibold text-cyan-400">1.</span> Click a suggested question
      </li>
      <li>
        <span className="font-semibold text-cyan-400">2.</span> Read the answer and its quote
      </li>
      <li>
        <span className="font-semibold text-cyan-400">3.</span> Click the citation to see the source
      </li>
    </ol>
  </header>
);

const DemoPage = () => {
  const { data: manifest, status: manifestStatus, error: manifestError } = useManifest();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { index, error: indexError } = useDocumentIndex(selectedId);
  const demoItems = useDemoItems(selectedId);
  const [providerChoice, setProviderChoice] = useState<ProviderChoice>(DEFAULT_PROVIDER_CHOICE);
  const [page, setPage] = useState(1);
  const [highlight, setHighlight] = useState<Bbox | undefined>(undefined);
  const [askState, setAskState] = useState<AskState>({ kind: 'idle' });

  useEffect(() => {
    if (manifest && manifest.length > 0 && !selectedId) {
      setSelectedId(manifest[0].id);
    }
  }, [manifest, selectedId]);

  const showAnswer = (answer: Answer): void => {
    setAskState({ kind: 'answered', answer });

    const firstVerified = findFirstVerified(answer);

    if (firstVerified?.page !== undefined) {
      setPage(firstVerified.page);
      setHighlight(firstVerified.bbox);
    }
  };

  const handleSelect = (id: string): void => {
    setSelectedId(id);
    setPage(1);
    setHighlight(undefined);
    setAskState({ kind: 'idle' });
  };

  const handleCitationClick = (citation: SpanCitation): void => {
    if (!citation.verified || citation.page === undefined) return;

    setPage(citation.page);
    setHighlight(citation.bbox);
  };

  const handleAsk = async (question: string): Promise<void> => {
    if (!index) return;

    try {
      const provider = buildProvider(providerChoice);

      setAskState({ kind: 'embedding' });
      // Dynamic import keeps transformers.js out of the initial bundle; only
      // live asks pay for it.
      const { embedQuery } = await import('../lib/pipeline/embed');

      setAskState({ kind: 'asking' });
      showAnswer(await askQuestion({ provider, embedQuery }, index, question));
    } catch (error) {
      setAskState({
        kind: 'error',
        message: error instanceof Error ? `${error.message}.${buildAskErrorHint(providerChoice)}` : String(error),
      });
    }
  };

  if (manifestStatus === 'error') return <ErrorState message={`Could not load the document list: ${manifestError}`} />;

  if (manifestStatus === 'missing' || manifest?.length === 0) {
    return <EmptyState message="No documents ingested yet. Run: npm run ingest" />;
  }

  if (!manifest) return <LoadingSkeleton label="Loading the document list..." />;

  const busy = askState.kind === 'embedding' || askState.kind === 'asking';

  return (
    <div>
      <IntroHeader />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col gap-5">
          <DocumentPicker manifest={manifest} selectedId={selectedId} onSelect={handleSelect} />
          <SuggestedQuestions items={demoItems} onPick={item => showAnswer(item.answer)} />

          {indexError && <ErrorState message={`Could not load the search index: ${indexError}`} />}
          {askState.kind === 'error' && <ErrorState message={askState.message} />}
          {askState.kind === 'answered' && (
            <AnswerCard answer={askState.answer} onCitationClick={handleCitationClick} />
          )}
          {askState.kind === 'idle' && <EmptyState message={IDLE_HINT} />}

          <div className="border-t border-neutral-800 pt-5">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Or ask your own question</span>
            <div className="mt-3 flex flex-col gap-3">
              <QuestionForm
                busy={busy || !index}
                busyLabel={index ? (BUSY_LABELS[askState.kind] ?? null) : 'Loading the document index...'}
                onAsk={question => void handleAsk(question)}
              />
              <details className="rounded border border-neutral-800 bg-neutral-900/40">
                <summary className="cursor-pointer px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 hover:text-neutral-300">
                  Model settings
                </summary>
                <div className="px-3 pb-3">
                  <ProviderPicker choice={providerChoice} onChange={setProviderChoice} />
                </div>
              </details>
            </div>
          </div>
        </div>

        {selectedId && <PdfViewer documentId={selectedId} page={page} highlight={highlight} onPageChange={setPage} />}
      </div>
    </div>
  );
};

export default DemoPage;
