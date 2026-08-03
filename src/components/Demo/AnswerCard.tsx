import type { Answer, SpanCitation } from '../../lib/types';
import { formatPercent } from '../../lib/utils/format';

interface AnswerCardProps {
  answer: Answer;
  onCitationClick: (citation: SpanCitation) => void;
}

const describeConfidence = (value: number): string => {
  if (value >= 0.75) return 'High';
  if (value >= 0.5) return 'Medium';
  return 'Low';
};

const CitationRow = ({ citation, onClick }: { citation: SpanCitation; onClick: (citation: SpanCitation) => void }) => {
  if (!citation.verified) {
    return (
      <li className="rounded border border-red-900/60 bg-red-950/30 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Unsupported</span>
        <p className="mt-1 text-sm text-neutral-400">“{citation.quote}”</p>
        <p className="mt-1 text-xs text-neutral-500">This quote was not found in the source document.</p>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(citation)}
        className="w-full rounded border border-cyan-900/60 bg-cyan-950/20 p-3 text-left transition-colors hover:border-cyan-600"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
          Verified · page {citation.page}
        </span>
        <p className="mt-1 text-sm text-neutral-300">“{citation.quote}”</p>
      </button>
    </li>
  );
};

const AnswerCard = ({ answer, onCitationClick }: AnswerCardProps) => {
  const { confidence } = answer;

  if (answer.refused) {
    return (
      <div className="rounded border border-amber-900/60 bg-amber-950/20 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Declined to answer</span>
        <p className="mt-2 text-neutral-200">{answer.text}</p>
        <p className="mt-2 text-xs text-neutral-500">
          The document does not contain this answer, and saying so beats making one up.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs uppercase tracking-wide text-neutral-500">{answer.model}</span>
        <span
          className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-cyan-300"
          title={`retrieval ${confidence.retrieval.toFixed(2)} · span verification ${confidence.spanVerification.toFixed(2)} · self consistency ${confidence.selfConsistency.toFixed(2)}`}
        >
          {describeConfidence(confidence.overall)} confidence · {formatPercent(confidence.overall)}
        </span>
      </div>

      <p className="mt-3 text-lg text-neutral-100">{answer.text}</p>

      {answer.citations.length > 0 && (
        <ul className="mt-4 space-y-2">
          {answer.citations.map((citation, index) => (
            <CitationRow key={`${citation.chunkId}-${index}`} citation={citation} onClick={onCitationClick} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnswerCard;
