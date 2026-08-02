import type { Answer } from '../../lib/types';

export interface DemoItem {
  question: string;
  answer: Answer;
}

interface SuggestedQuestionsProps {
  items: DemoItem[];
  onPick: (item: DemoItem) => void;
}

/** Precomputed answers: instant for visitors, zero inference cost to serve. */
const SuggestedQuestions = ({ items, onPick }: SuggestedQuestionsProps) => {
  if (items.length === 0) return null;

  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-neutral-500">Try one</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.question}
            type="button"
            onClick={() => onPick(item)}
            className="rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-cyan-500 hover:text-cyan-300"
          >
            {item.question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
