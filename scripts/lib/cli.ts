/**
 * Shared entry point for every script: one place that decides how a failure is
 * reported and that the process exits non zero, so the five scripts cannot
 * drift into logging stacks versus messages inconsistently.
 */
export const runCli = (main: () => Promise<void>, hint?: string): void => {
  main().catch((error: unknown) => {
    if (hint) console.error(hint);

    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
    process.exit(1);
  });
};
