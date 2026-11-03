/**
 * Stands in for the network until pages are wired. Every mutation in a page
 * awaits `simulateRequest`, so the pending states of the primitives are
 * exercised in the demo. Once wired, the API client (src/api/) replaces this
 * and the pages' `await` lines stay as they are; its stand-in's `failNext`
 * makes a request fail.
 */

/** Delay to make pending states visible, in ms. */
const LATENCY_MS = 600;

/** Resolves with `result` after a short delay. */
export function simulateRequest<T = void>(result?: T, options: { latencyMs?: number } = {}): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(result as T), options.latencyMs ?? LATENCY_MS));
}
