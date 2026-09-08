export interface FetchWithRetryOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
    maxRetries?: number;
    baseDelayMs?: number;
}
/**
 * Plain fetch() with exponential-backoff retry on network errors, 429s, and
 * 5xx responses. No proxy, no fingerprint spoofing - see the doctrine note
 * above. 4xx (other than 429) is returned as-is (not retried) so callers can
 * inspect e.g. a 404 or a BYOK vendor's 401 without this helper masking it.
 */
export declare function fetchWithRetry(url: string, options?: FetchWithRetryOptions): Promise<Response>;
export declare function fetchTextWithRetry(url: string, options?: FetchWithRetryOptions): Promise<string>;
//# sourceMappingURL=http.d.ts.map