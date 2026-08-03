/** Renders a 0 to 1 ratio as a whole percent, for tables and badges. */
export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** Renders a millisecond duration in seconds at one decimal place. */
export const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;
