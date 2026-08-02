export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
}

export interface CompletionResult {
  text: string;
  model: string;
}

/**
 * Every model integration implements this. The rest of the codebase never
 * talks to a model API directly, so swapping Ollama for Gemini, Groq or a
 * visitor's own key is a constructor change, not a refactor.
 */
export interface Provider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
