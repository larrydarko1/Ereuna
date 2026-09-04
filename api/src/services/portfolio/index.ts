/**
 * portfolio — the event-sourced portfolio.
 * The trade log is the only thing stored: `portfolio-trades` appends to it,
 * `portfolio-rebuild` replays it into cash, positions and value history after
 * every write, and `portfolio-summary` reads the result. Nothing is incremented
 * in place, which is what makes editing and deleting a trade safe.
 */
export * from '@/services/portfolio/portfolio-crud.js';
export * from '@/services/portfolio/portfolio-rebuild.js';
export * from '@/services/portfolio/portfolio-summary.js';
export * from '@/services/portfolio/portfolio-trades.js';
