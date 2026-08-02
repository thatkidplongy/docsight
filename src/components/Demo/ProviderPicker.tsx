export type ProviderChoice = { kind: 'ollama' } | { kind: 'gemini'; apiKey: string };

interface ProviderPickerProps {
  choice: ProviderChoice;
  onChange: (choice: ProviderChoice) => void;
}

/**
 * The Gemini key lives in component state only, per CONVENTIONS.md: never
 * persisted, never sent anywhere except Google's API from this browser.
 */
const ProviderPicker = ({ choice, onChange }: ProviderPickerProps) => (
  <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3 text-sm">
    <span className="text-xs uppercase tracking-wide text-neutral-500">Live model</span>

    <div className="mt-2 flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-neutral-300">
        <input
          type="radio"
          name="provider"
          checked={choice.kind === 'ollama'}
          onChange={() => onChange({ kind: 'ollama' })}
          className="accent-cyan-500"
        />
        Local Ollama
      </label>
      <label className="flex items-center gap-2 text-neutral-300">
        <input
          type="radio"
          name="provider"
          checked={choice.kind === 'gemini'}
          onChange={() => onChange({ kind: 'gemini', apiKey: '' })}
          className="accent-cyan-500"
        />
        Gemini (your key)
      </label>
    </div>

    {choice.kind === 'gemini' && (
      <div className="mt-3">
        <input
          type="password"
          value={choice.apiKey}
          onChange={event => onChange({ kind: 'gemini', apiKey: event.target.value })}
          placeholder="Gemini API key (kept in memory, sent only to Google)"
          autoComplete="off"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:border-cyan-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-neutral-500">
          Your key stays in this tab's memory and goes only to Google's API. Get a free key at aistudio.google.com.
        </p>
      </div>
    )}
  </div>
);

export default ProviderPicker;
