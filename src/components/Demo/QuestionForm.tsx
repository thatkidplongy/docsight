import { useState, type FormEvent } from 'react';

interface QuestionFormProps {
  busy: boolean;
  busyLabel: string | null;
  onAsk: (question: string) => void;
}

const QuestionForm = ({ busy, busyLabel, onAsk }: QuestionFormProps) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();

    const trimmed = question.trim();

    if (!trimmed || busy) return;

    onAsk(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="question-input" className="text-xs uppercase tracking-wide text-neutral-500">
        Ask the filing
      </label>
      <div className="flex gap-2">
        <input
          id="question-input"
          type="text"
          value={question}
          onChange={event => setQuestion(event.target.value)}
          placeholder="How much was spent on research and development?"
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:border-cyan-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-cyan-500 px-4 py-2 font-semibold text-neutral-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
        >
          Ask
        </button>
      </div>
      {busy && busyLabel && <p className="text-sm text-neutral-500">{busyLabel}</p>}
    </form>
  );
};

export default QuestionForm;
