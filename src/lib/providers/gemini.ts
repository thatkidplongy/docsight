import type { ChatMessage, CompletionRequest, CompletionResult, Provider } from './provider';

const DEFAULT_MODEL = 'gemini-3.6-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

interface GeminiModelList {
  models?: { name?: string; supportedGenerationMethods?: string[] }[];
}

const toGeminiContents = (messages: ChatMessage[]) =>
  messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

/**
 * Google retires model IDs on its own schedule, so a hardcoded default will
 * eventually break for new keys. This recognises that specific failure so the
 * provider can rediscover a working model instead of surfacing a dead end.
 */
const isModelUnavailable = (status: number, message: string): boolean =>
  status === 404 || /no longer available|not found|not supported/i.test(message);

/**
 * Bring your own key path: the visitor's browser calls Gemini directly, so the
 * key never touches DocSight infrastructure. It is sent as a header, never in
 * the URL, and callers must keep it in memory only.
 */
export class GeminiProvider implements Provider {
  private readonly apiKey: string;
  private model: string;
  /** Set once a fallback model has been resolved, so discovery runs at most once. */
  private rediscovered = false;

  constructor(options: { apiKey: string; model?: string }) {
    if (!options.apiKey.trim()) {
      throw new Error('A Gemini API key is required');
    }

    this.apiKey = options.apiKey.trim();
    this.model = options.model ?? DEFAULT_MODEL;
  }

  /** A getter, not a field: rediscovery can change the model mid session. */
  get name(): string {
    return `gemini/${this.model}`;
  }

  /** Newest usable flash model this key can actually call, by version then name. */
  private async discoverModel(): Promise<string> {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: { 'x-goog-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Could not list Gemini models: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiModelList;

    const candidates = (data.models ?? [])
      .map(entry => ({
        id: (entry.name ?? '').replace(/^models\//, ''),
        methods: entry.supportedGenerationMethods ?? [],
      }))
      .filter(
        entry =>
          entry.methods.includes('generateContent') &&
          /flash/.test(entry.id) &&
          !/(image|live|audio|omni|embedding|preview)/.test(entry.id)
      )
      .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));

    if (candidates.length === 0) {
      throw new Error('This Gemini key has no available flash models that support generateContent');
    }

    return candidates[0].id;
  }

  private async requestCompletion(request: CompletionRequest): Promise<Response> {
    const systemText = request.messages
      .filter(message => message.role === 'system')
      .map(message => message.content)
      .join('\n');

    return await fetch(`${BASE_URL}/models/${this.model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: toGeminiContents(request.messages),
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        generationConfig: {
          temperature: request.temperature ?? 0,
          ...(request.jsonSchema ? { responseMimeType: 'application/json', responseSchema: request.jsonSchema } : {}),
        },
      }),
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    let response = await this.requestCompletion(request);
    let data = (await response.json()) as GeminiResponse;

    if (!response.ok && !this.rediscovered && isModelUnavailable(response.status, data.error?.message ?? '')) {
      this.rediscovered = true;
      this.model = await this.discoverModel();
      response = await this.requestCompletion(request);
      data = (await response.json()) as GeminiResponse;
    }

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${data.error?.message ?? response.statusText}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('');

    if (!text) {
      throw new Error('Gemini returned no text candidates');
    }

    return { text, model: this.model };
  }
}
