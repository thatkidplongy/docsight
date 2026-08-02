import type { CompletionRequest, CompletionResult, Provider } from './provider';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:4b';

/** Bounds a runaway generation; thinking plus a JSON answer fits well within this. */
const MAX_OUTPUT_TOKENS = 4096;

/**
 * Qwen's model card warns that greedy decoding makes thinking mode loop until
 * the token budget is gone (observed: an eval question burned its whole
 * budget on thinking and produced no answer). Their recommended thinking
 * temperature is 0.6.
 */
const THINKING_TEMPERATURE = 0.6;

interface OllamaStreamChunk {
  model?: string;
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

export class OllamaProvider implements Provider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly think: boolean | undefined;

  constructor(options: { model?: string; baseUrl?: string; think?: boolean } = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    // Only sent when set: passing think to a model without thinking support errors.
    this.think = options.think;
    this.name = `ollama/${this.model}`;
  }

  /**
   * Streamed on purpose: undici (Node fetch) times out any response whose
   * headers or body sit idle for 300s, and a thinking model can easily exceed
   * that before its first byte of a non streamed reply. With streaming the
   * connection carries tokens continuously, so long generations survive.
   */
  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        stream: true,
        // Ollama defaults to a 4096 token context; six retrieved passages
        // plus thinking plus the answer need more headroom than that.
        options: {
          temperature: this.think && !request.temperature ? THINKING_TEMPERATURE : (request.temperature ?? 0),
          num_ctx: 8192,
          num_predict: MAX_OUTPUT_TOKENS,
        },
        ...(request.jsonSchema ? { format: request.jsonSchema } : {}),
        ...(this.think === undefined ? {} : { think: this.think }),
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    let text = '';
    let model = this.model;

    const consumeLine = (line: string): void => {
      if (!line.trim()) return;

      const chunk = JSON.parse(line) as OllamaStreamChunk;

      if (chunk.error) {
        throw new Error(`Ollama error: ${chunk.error}`);
      }

      text += chunk.message?.content ?? '';

      if (chunk.model) model = chunk.model;
    };

    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;

      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';

      for (const line of lines) consumeLine(line);
    }

    consumeLine(buffered);

    if (!text) {
      throw new Error('Ollama returned no content');
    }

    return { text, model };
  }
}
