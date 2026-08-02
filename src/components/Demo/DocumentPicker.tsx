import type { ManifestEntry } from '../../lib/types';

interface DocumentPickerProps {
  manifest: ManifestEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DocumentPicker = ({ manifest, selectedId, onSelect }: DocumentPickerProps) => (
  <div>
    <label htmlFor="document-picker" className="text-xs uppercase tracking-wide text-neutral-500">
      Filing
    </label>
    <select
      id="document-picker"
      value={selectedId ?? ''}
      onChange={event => onSelect(event.target.value)}
      className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-cyan-500 focus:outline-none"
    >
      {manifest.map(entry => (
        <option key={entry.id} value={entry.id}>
          {entry.company} · {entry.form} filed {entry.filingDate} · {entry.pages} pages
        </option>
      ))}
    </select>
  </div>
);

export default DocumentPicker;
