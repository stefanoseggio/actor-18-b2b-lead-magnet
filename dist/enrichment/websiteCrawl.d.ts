export interface WebsiteCrawlResult {
    finalUrl: string | null;
    emailsFound: string[];
    phones: string[];
    socialLinks: string[];
    /** true when the site could not be fetched, is robots.txt-disallowed, or looks like a JS-rendered SPA with no server-delivered content. */
    websiteContentUnavailable: boolean;
    jsonLdLocalBusiness: Record<string, unknown> | null;
    secondaryPageFetched: string | null;
    /** Combined visible text of the crawled page(s), truncated - feeds the optional Step 5 intent-score prompt. Empty when unavailable. */
    pageText: string;
    /** Third-party <script src> hostnames found in the raw HTML - a cheap tech-stack signal for the optional intent score. */
    scriptSources: string[];
}
export declare function extractDomain(rawUrl: string): string | null;
/**
 * Minimal robots.txt evaluator: true when the "*" user-agent group
 * disallows `path` (a later, more specific Allow for the same exact path
 * re-permits it). Deliberately simple - this actor only ever needs to ask
 * "can I fetch '/' at all", not run a general-purpose crawler.
 */
export declare function isPathDisallowed(robotsTxt: string, path: string): boolean;
/**
 * Step 2 of the waterfall: plain fetch()+cheerio against the business's own
 * homepage plus one secondary page (contact/about/careers, if linked from
 * the homepage's own nav). Respects robots.txt. Degrades gracefully
 * (`websiteContentUnavailable: true`) on a JS-rendered SPA - this actor
 * never escalates to a headless browser, matching the fleet's stated
 * "no headful fallback" doctrine.
 */
export declare function crawlWebsite(rawWebsite: string): Promise<WebsiteCrawlResult>;
//# sourceMappingURL=websiteCrawl.d.ts.map