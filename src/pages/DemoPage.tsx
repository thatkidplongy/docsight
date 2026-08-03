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
  'Ask a question and every claim in the answer arrives with a citation you can click to see the exact source region, verified against the document by code rather than trusted from the model.';

const buildProvider = (choice: ProviderChoice): Provider => {
  if (choice.kind === 'gemini') return new GeminiProvider({ apiKey: choice.apiKey });

  return new OllamaProvider();
};

const findFirstVerified = (answer: Answer): SpanCitation | undefined =>
  answer.citations.find(citation => citation.verified);

const DemoPage = () => {
  const { data: manifest, status: manifestStatus, error: manifestError } = useManifest();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { index, error: indexError } = useDocumentIndex(selectedId);
  const demoItems = useDemoItems(selectedId);
  const [providerChoice, setProviderChoice] = useState<ProviderChoice>({ kind: 'ollama' });
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
      const hint =
        providerChoice.kind === 'ollama'
          ? ' Live asking with the local option needs Ollama running on your machine; try a suggested question above, or use the Gemini option with your own key.'
          : '';
      setAskState({
        kind: 'error',
        message: error instanceof Error ? `${error.message}.${hint}` : String(error),
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex flex-col gap-5">
        <DocumentPicker manifest={manifest} selectedId={selectedId} onSelect={handleSelect} />
        <SuggestedQuestions items={demoItems} onPick={item => showAnswer(item.answer)} />
        <QuestionForm
          busy={busy || !index}
          busyLabel={index ? (BUSY_LABELS[askState.kind] ?? null) : 'Loading the document index...'}
          onAsk={question => void handleAsk(question)}
        />
        <ProviderPicker choice={providerChoice} onChange={setProviderChoice} />

        {indexError && <ErrorState message={`Could not load the search index: ${indexError}`} />}
        {askState.kind === 'error' && <ErrorState message={askState.message} />}
        {askState.kind === 'answered' && <AnswerCard answer={askState.answer} onCitationClick={handleCitationClick} />}
        {askState.kind === 'idle' && <EmptyState message={IDLE_HINT} />}
      </div>

      {selectedId && <PdfViewer documentId={selectedId} page={page} highlight={highlight} onPageChange={setPage} />}
    </div>
  );
};

export default DemoPage;
