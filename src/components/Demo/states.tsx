export const LoadingSkeleton = ({ label }: { label: string }) => (
  <div className="rounded border border-neutral-800 bg-neutral-900/40 p-6">
    <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-800" />
    <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-neutral-800" />
    <p className="mt-4 text-sm text-neutral-500">{label}</p>
  </div>
);

export const ErrorState = ({ message }: { message: string }) => (
  <div className="rounded border border-red-900/60 bg-red-950/20 p-4">
    <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Something went wrong</span>
    <p className="mt-2 text-sm text-neutral-300">{message}</p>
  </div>
);

export const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded border border-neutral-800 bg-neutral-900/40 p-6 text-sm text-neutral-500">{message}</div>
);
