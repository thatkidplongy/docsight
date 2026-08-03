import type { ResultsFile } from '../lib/types';
import { RESULTS_URL } from '../lib/retrieval/index-files';
import { useJsonResource } from '../lib/hooks/useJsonResource';
import { formatDuration, formatPercent } from '../lib/utils/format';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/Demo/states';

const ResultsTable = ({ results }: { results: ResultsFile }) => (
  <div className="overflow-x-auto rounded border border-neutral-800">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
        <tr>
          <th className="px-4 py-3">Model</th>
          <th className="px-4 py-3">Accuracy</th>
          <th className="px-4 py-3">Refusal accuracy</th>
          <th className="px-4 py-3">Verified citation rate</th>
          <th className="px-4 py-3">Avg latency</th>
          <th className="px-4 py-3">Avg confidence</th>
        </tr>
      </thead>
      <tbody>
        {results.models.map(model => (
          <tr key={model.model} className="border-t border-neutral-800">
            <td className="px-4 py-3 font-medium text-neutral-100">{model.model}</td>
            <td className="px-4 py-3 text-cyan-300">{formatPercent(model.accuracy)}</td>
            <td className="px-4 py-3">{formatPercent(model.refusalAccuracy)}</td>
            <td className="px-4 py-3">{formatPercent(model.citationRate)}</td>
            <td className="px-4 py-3">{formatDuration(model.avgLatencyMs)}</td>
            <td className="px-4 py-3">{formatPercent(model.avgConfidence)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Methodology = ({ results }: { results: ResultsFile }) => (
  <section className="mt-10 max-w-3xl space-y-4 text-sm leading-relaxed text-neutral-400">
    <h2 className="text-lg font-semibold text-neutral-100">Methodology</h2>
    <p>
      The gold set holds {results.goldSetSize} questions over ten SEC 10-K filings: verifiable financial figures
      (revenue, net income, R&D spend, per share figures) plus refusal probes asking for facts the filings do not
      contain. A correct answer must state the gold figure; a correct refusal must decline rather than guess.
    </p>
    <p>
      Every model runs the identical pipeline: hybrid retrieval (BM25 fused with dense embeddings via reciprocal rank
      fusion), the same prompt, and the same span verification. Citations only count when the quoted span literally
      exists in the source document, checked by code rather than trusted from the model.
    </p>
    <p>
      Confidence is composed from retrieval similarity (35%), span verification rate (45%) and self consistency (20%),
      documented in src/lib/qa/confidence.ts. All models run locally through Ollama on consumer hardware, so latency
      reflects a laptop, not a datacenter.
    </p>
    <p className="text-neutral-500">
      Generated {new Date(results.generatedAt).toLocaleDateString()} · gold set and harness are in the repository for
      reproduction.
    </p>
  </section>
);

const BenchmarkPage = () => {
  const { data: results, status } = useJsonResource<ResultsFile>(RESULTS_URL);

  if (status === 'loading') return <LoadingSkeleton label="Loading benchmark results..." />;

  if (status === 'missing') return <EmptyState message="No results yet. Run: npm run eval" />;

  if (status === 'error' || !results) return <ErrorState message="Could not load benchmark results." />;

  return (
    <section>
      <h1 className="text-3xl font-semibold text-white">Benchmark</h1>
      <p className="mt-3 max-w-2xl text-neutral-400">
        The same grounded Q&A pipeline, measured across local models against a labelled gold set.
      </p>

      <div className="mt-8">
        <ResultsTable results={results} />
      </div>

      <Methodology results={results} />
    </section>
  );
};

export default BenchmarkPage;
