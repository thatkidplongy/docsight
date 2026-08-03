import { OllamaProvider } from '../src/lib/providers/ollama';
import { runCli } from './lib/cli';

const runSmokeTest = async (): Promise<void> => {
  const provider = new OllamaProvider();
  const result = await provider.complete({
    messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
  });

  console.log(`[${provider.name}] ${result.text.trim()}`);
};

runCli(runSmokeTest, 'Smoke test failed. Is Ollama running? Start it with: brew services start ollama');
