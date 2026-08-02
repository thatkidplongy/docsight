import type { ChatMessage, CompletionRequest, CompletionResult, Provider } from './provider';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

const toGeminiContents = (messages: ChatMessage[]) =>
  messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

/**
 * Bring your own key path: the visitor's browser calls Gemini directly, so the
 * key never touches DocSight infrastructure. It is sent as a header, never in
 * the URL, and callers must keep it in memory only.
 */
export class GeminiProvider implements Provider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: { apiKey: string; model?: string }) {
    if (!options.apiKey.trim()) {
      throw new Error('A Gemini API key is required');
    }

    this.apiKey = options.apiKey.trim();
    this.model = options.model ?? DEFAULT_MODEL;
    this.name = `gemini/${this.model}`;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const systemText = request.messages
      .filter(message => message.role === 'system')
      .map(message => message.content)
      .join('\n');

    const response = await fetch(`${BASE_URL}/models/${this.model}:generateContent`, {
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

    const data = (await response.json()) as GeminiResponse;

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
