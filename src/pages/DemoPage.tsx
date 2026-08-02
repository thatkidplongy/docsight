import { useEffect, useState } from 'react';
import type { Answer, SpanCitation } from '../lib/types';
import type { Bbox } from '../lib/pipeline/geometry';
import { embedTexts } from '../lib/pipeline/embed';
import { OllamaProvider } from '../lib/providers/ollama';
import { askQuestion } from '../lib/qa/ask';
import { useManifest } from '../lib/hooks/useManifest';
import { useDocumentIndex } from '../lib/hooks/useDocumentIndex';
import DocumentPicker from '../components/Demo/DocumentPicker';
import QuestionForm from '../components/Demo/QuestionForm';
import AnswerCard from '../components/Demo/AnswerCard';
import PdfViewer from '../components/Demo/PdfViewer';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/Demo/states';

type AskStatus = 'idle' | 'embedding' | 'asking';

const BUSY_LABELS: Record<AskStatus, string | null> = {
  idle: null,
  embedding: 'Embedding your question in the browser (first ask downloads a small model)...',
  asking: 'Asking the local model...',
};

const DemoPage = () => {
  const { manifest, error: manifestError } = useManifest();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { index, error: indexError } = useDocumentIndex(selectedId);
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

  const handleAsk = async (question: string): Promise<void> => {
    if (!index) return;

    setAskError(null);
    setAnswer(null);

    try {
      setAskStatus('embedding');
      const provider = new OllamaProvider({ think: true });

      setAskStatus('asking');
      const result = await askQuestion(
        { provider, embedQuery: async text => await embedTexts([text]) },
        index,
        question
      );

      setAnswer(result);

      const firstVerified = result.citations.find(citation => citation.verified);

      if (firstVerified?.page !== undefined) {
        setPage(firstVerified.page);
        setHighlight(firstVerified.bbox);
      }
    } catch (error) {
      setAskError(
        error instanceof Error
          ? `${error.message}. Live asking needs Ollama running locally; the deployed demo will ship precomputed answers and a bring your own key option.`
          : String(error)
      );
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
        <QuestionForm
          busy={askStatus !== 'idle' || !index}
          busyLabel={index ? BUSY_LABELS[askStatus] : 'Loading the document index...'}
          onAsk={question => void handleAsk(question)}
        />

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
