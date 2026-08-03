import type { CompletionRequest, CompletionResult, Provider } from './provider';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:4b';

interface ModelCapabilities {
  /** Whether the model supports a thinking phase; sending think to one that does not errors. */
  think: boolean;
  /**
   * Default sampling temperature. Qwen documents 0.6 for thinking mode because
   * greedy decoding makes its thinking loop until the token budget is gone.
   */
  temperature: number;
  contextTokens: number;
  /** Thinking measures ~2,700 tokens on financial questions, so budgets are sized to that. */
  outputTokens: number;
}

const THINKING_CAPABILITIES: ModelCapabilities = {
  think: true,
  temperature: 0.6,
  contextTokens: 12288,
  outputTokens: 6144,
};

const PLAIN_CAPABILITIES: ModelCapabilities = {
  think: false,
  temperature: 0,
  contextTokens: 8192,
  outputTokens: 2048,
};

/**
 * Which models think is a property of the model, not a decision for each call
 * site. Keeping it here means a caller can switch models without knowing, and
 * the default model can change without silently breaking every script.
 */
const CAPABILITIES_BY_MODEL: Record<string, ModelCapabilities> = {
  'qwen3:4b': THINKING_CAPABILITIES,
};

const resolveCapabilities = (model: string): ModelCapabilities => CAPABILITIES_BY_MODEL[model] ?? PLAIN_CAPABILITIES;

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
  private readonly capabilities: ModelCapabilities;

  constructor(options: { model?: string; baseUrl?: string } = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.capabilities = resolveCapabilities(this.model);
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
        think: this.capabilities.think,
        options: {
          temperature: request.temperature ?? this.capabilities.temperature,
          num_ctx: this.capabilities.contextTokens,
          num_predict: this.capabilities.outputTokens,
        },
        ...(request.jsonSchema ? { format: request.jsonSchema } : {}),
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    return await this.readStream(response.body);
  }

  private async readStream(body: ReadableStream<Uint8Array>): Promise<CompletionResult> {
    const reader = body.getReader();
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
