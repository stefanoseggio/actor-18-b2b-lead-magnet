async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
// Unlike the fleet's single-source actors (one fixed BASE_URL), this actor
// calls several independent hosts: OSM's public Overpass interpreter, each
// discovered business's own website (an arbitrary, unbounded set of hosts),
// and - only when the customer/operator supplies a key - Hunter.io, People
// Data Labs, and the Anthropic API. Every one of those calls is plain
// fetch() with no proxy and no browser/TLS fingerprint spoofing: a genuine,
// identifying User-Agent is sent instead, per the fleet's documented
// no-evasion doctrine (_gtm/03-nextgen-commercial-frontiers/
// 03-margin-optimization-and-proxies.md §1.2 - "never a fingerprint/
// challenge-defeat technique") and its stated precedent that the fix for a
// bot-check is a plainer standard client, never impersonation.
//
// verified live 2026-09-07: overpass-api.de's public /api/interpreter
// endpoint answers a bare POST with this identifying User-Agent and no
// prior session/cookie with a normal JSON response - no CAPTCHA/WAF
// challenge. Individual small-business marketing sites are, by
// construction, out of this actor's control to pre-verify one-by-one; the
// graceful-degradation behavior in src/enrichment/websiteCrawl.ts (never
// escalating to a headless browser) is this actor's compliant answer for
// any one of them that does present a JS-rendered SPA or blocks a plain
// client.
const USER_AGENT = 'Mozilla/5.0 (compatible; ActorB2BLeadMagnet/1.0; +https://apify.com/actors; contact: stefanoseggio28@gmail.com)';
/**
 * Plain fetch() with exponential-backoff retry on network errors, 429s, and
 * 5xx responses. No proxy, no fingerprint spoofing - see the doctrine note
 * above. 4xx (other than 429) is returned as-is (not retried) so callers can
 * inspect e.g. a 404 or a BYOK vendor's 401 without this helper masking it.
 */
export async function fetchWithRetry(url, options = {}) {
    const { maxRetries = 3, baseDelayMs = 500, headers, ...rest } = options;
    let lastError = new Error(`fetchWithRetry: exhausted retries for ${url}`);
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                redirect: 'follow',
                headers: { 'User-Agent': USER_AGENT, ...headers },
                ...rest,
            });
            if (response.status === 429 || response.status >= 500) {
                throw new Error(`HTTP ${response.status} for ${url}`);
            }
            return response;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
                await sleep(baseDelayMs * 2 ** attempt);
            }
        }
    }
    throw lastError;
}
export async function fetchTextWithRetry(url, options) {
    const response = await fetchWithRetry(url, options);
    if (!response.ok)
        throw new Error(`HTTP ${response.status} for ${url}`);
    return response.text();
}
//# sourceMappingURL=http.js.map