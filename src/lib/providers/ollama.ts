import type { CompletionRequest, CompletionResult, Provider } from './provider';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:4b';

interface OllamaChatResponse {
  model: string;
  message?: { content: string };
}

export class OllamaProvider implements Provider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: { model?: string; baseUrl?: string } = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.name = `ollama/${this.model}`;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        stream: false,
        options: { temperature: request.temperature ?? 0 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    if (!data.message) {
      throw new Error('Ollama returned no message in its response');
    }

    return { text: data.message.content, model: data.model };
  }
}
