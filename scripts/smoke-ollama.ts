import { OllamaProvider } from '../src/lib/providers/ollama';

const runSmokeTest = async (): Promise<void> => {
  const provider = new OllamaProvider();
  const result = await provider.complete({
    messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
  });

  console.log(`[${provider.name}] ${result.text.trim()}`);
};

runSmokeTest().catch(error => {
  console.error('Smoke test failed. Is Ollama running? Start it with: brew services start ollama');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
