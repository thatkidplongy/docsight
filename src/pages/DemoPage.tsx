import { useEffect, useState } from 'react';
import type { Answer, SpanCitation } from '../lib/types';
import type { Bbox } from '../lib/pipeline/geometry';
import type { Provider } from '../lib/providers/provider';
import { OllamaProvider } from '../lib/providers/ollama';
import { GeminiProvider } from '../lib/providers/gemini';
import { askQuestion } from '../lib/qa/ask';
import { useManifest } from '../lib/hooks/useManifest';
import { useDocumentIndex } from '../lib/hooks/useDocumentIndex';
import DocumentPicker from '../components/Demo/DocumentPicker';
import QuestionForm from '../components/Demo/QuestionForm';
import AnswerCard from '../components/Demo/AnswerCard';
import PdfViewer from '../components/Demo/PdfViewer';
import ProviderPicker, { type ProviderChoice } from '../components/Demo/ProviderPicker';
import SuggestedQuestions, { type DemoItem } from '../components/Demo/SuggestedQuestions';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/Demo/states';

type AskStatus = 'idle' | 'embedding' | 'asking';

const BUSY_LABELS: Record<AskStatus, string | null> = {
  idle: null,
  embedding: 'Embedding your question in the browser (first ask downloads a small model)...',
  asking: 'Asking the model...',
};

const buildProvider = (choice: ProviderChoice): Provider => {
  if (choice.kind === 'gemini') return new GeminiProvider({ apiKey: choice.apiKey });

  return new OllamaProvider({ think: true });
};

const useDemoItems = (documentId: string | null): DemoItem[] => {
  const [items, setItems] = useState<DemoItem[]>([]);

  useEffect(() => {
    if (!documentId) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setItems([]);

    const fetchItems = async (): Promise<void> => {
      try {
        const response = await fetch(`/data/demo/${documentId}.json`);

        if (!response.ok) return;

        const file = (await response.json()) as { items: DemoItem[] };

        if (!cancelled) setItems(file.items);
      } catch {
        // Precomputed answers are an enhancement; their absence is not an error.
      }
    };

    void fetchItems();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return items;
};

const DemoPage = () => {
  const { manifest, error: manifestError } = useManifest();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { index, error: indexError } = useDocumentIndex(selectedId);
  const demoItems = useDemoItems(selectedId);
  const [providerChoice, setProviderChoice] = useState<ProviderChoice>({ kind: 'ollama' });
  const [page, setPage] = useState(1);
  const [highlight, setHighlight] = useState<Bbox | undefined>(undefined);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [askStatus, setAskStatus] = useState<AskStatus>('idle');
  const [askError, setAskError] = useState<string | null>(null);

  useEffect(() => {
    if (manifest && manifest.length > 0 && !selectedId) {
      setSelectedId(manifest[0].id);
    }
  }, [manifest, selectedId]);

  const jumpToFirstVerified = (result: Answer): void => {
    const firstVerified = result.citations.find(citation => citation.verified);

    if (firstVerified?.page !== undefined) {
      setPage(firstVerified.page);
      setHighlight(firstVerified.bbox);
    }
  };

  const handleSelect = (id: string): void => {
    setSelectedId(id);
    setPage(1);
    setHighlight(undefined);
    setAnswer(null);
    setAskError(null);
  };

  const handleCitationClick = (citation: SpanCitation): void => {
    if (!citation.verified || citation.page === undefined) return;

    setPage(citation.page);
    setHighlight(citation.bbox);
  };

  const handlePickSuggested = (item: DemoItem): void => {
    setAskError(null);
    setAnswer(item.answer);
    jumpToFirstVerified(item.answer);
  };

  const handleAsk = async (question: string): Promise<void> => {
    if (!index) return;

    setAskError(null);
    setAnswer(null);

    try {
      const provider = buildProvider(providerChoice);

      setAskStatus('embedding');
      // Dynamic import keeps transformers.js out of the initial bundle; only
      // live asks pay for it.
      const { embedTexts } = await import('../lib/pipeline/embed');

      setAskStatus('asking');
      const result = await askQuestion(
        { provider, embedQuery: async text => await embedTexts([text]) },
        index,
        question
      );

      setAnswer(result);
      jumpToFirstVerified(result);
    } catch (error) {
      const hint =
        providerChoice.kind === 'ollama'
          ? ' Live asking with the local option needs Ollama running on your machine; try a suggested question above, or use the Gemini option with your own key.'
          : '';
      setAskError(error instanceof Error ? `${error.message}.${hint}` : String(error));
    } finally {
      setAskStatus('idle');
    }
  };

  if (manifestError) return <ErrorState message={`Could not load the document list: ${manifestError}`} />;

  if (!manifest) return <LoadingSkeleton label="Loading the document list..." />;

  if (manifest.length === 0) return <EmptyState message="No documents ingested yet. Run: npm run ingest" />;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex flex-col gap-5">
        <DocumentPicker manifest={manifest} selectedId={selectedId} onSelect={handleSelect} />
        <SuggestedQuestions items={demoItems} onPick={handlePickSuggested} />
        <QuestionForm
          busy={askStatus !== 'idle' || !index}
          busyLabel={index ? BUSY_LABELS[askStatus] : 'Loading the document index...'}
          onAsk={question => void handleAsk(question)}
        />
        <ProviderPicker choice={providerChoice} onChange={setProviderChoice} />

        {indexError && <ErrorState message={`Could not load the search index: ${indexError}`} />}
        {askError && <ErrorState message={askError} />}
        {answer && <AnswerCard answer={answer} onCitationClick={handleCitationClick} />}
        {!answer && !askError && askStatus === 'idle' && (
          <EmptyState message="Ask a question and every claim in the answer arrives with a citation you can click to see the exact source region, verified against the document by code rather than trusted from the model." />
        )}
      </div>

      {selectedId && <PdfViewer documentId={selectedId} page={page} highlight={highlight} onPageChange={setPage} />}
    </div>
  );
};

export default DemoPage;
