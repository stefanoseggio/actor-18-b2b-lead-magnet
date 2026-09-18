import * as cheerio from 'cheerio';
import { fetchWithRetry } from '../http.js';
const SECONDARY_PATH_PATTERN = /\/(contact|about|careers)([/?#].*)?$/i;
const EMAIL_REGEX = /[a-zA-Z0-9.+_-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\+?\d[\d\s().-]{7,}\d/g;
const SOCIAL_HOST_PATTERN = /(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com)/i;
export function extractDomain(rawUrl) {
    try {
        const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
        return new URL(normalized).hostname.replace(/^www\./i, '');
    }
    catch {
        return null;
    }
}
function normalizeUrl(rawUrl) {
    return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
}
/**
 * Minimal robots.txt evaluator: true when the "*" user-agent group
 * disallows `path` (a later, more specific Allow for the same exact path
 * re-permits it). Deliberately simple - this actor only ever needs to ask
 * "can I fetch '/' at all", not run a general-purpose crawler.
 */
export function isPathDisallowed(robotsTxt, path) {
    const lines = robotsTxt.split('\n').map((line) => line.split('#')[0].trim());
    let appliesToUs = false;
    let disallowed = false;
    for (const line of lines) {
        if (!line)
            continue;
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1)
            continue;
        const key = line.slice(0, separatorIndex).trim().toLowerCase();
        const value = line.slice(separatorIndex + 1).trim();
        if (key === 'user-agent') {
            appliesToUs = value === '*';
        }
        else if (appliesToUs && key === 'disallow' && value) {
            if (value === '/' || path === value || path.startsWith(value)) {
                disallowed = true;
            }
        }
        else if (appliesToUs && key === 'allow' && value === path) {
            disallowed = false;
        }
    }
    return disallowed;
}
async function isDisallowedByRobots(origin) {
    try {
        const response = await fetchWithRetry(`${origin}/robots.txt`, { maxRetries: 1 });
        // No robots.txt (404) or unreachable => nothing declared, proceed -
        // matches the fleet's documented HSE precedent that a 404 robots.txt
        // means no restrictions declared.
        if (!response.ok)
            return false;
        const body = await response.text();
        return isPathDisallowed(body, '/');
    }
    catch {
        return false;
    }
}
function extractJsonLdLocalBusiness($) {
    let found = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        if (found)
            return;
        try {
            const parsed = JSON.parse($(el).contents().text());
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
                const rawType = item?.['@type'];
                const types = Array.isArray(rawType) ? rawType : [rawType];
                if (types.some((t) => typeof t === 'string' && t.includes('LocalBusiness'))) {
                    found = item;
                    break;
                }
            }
        }
        catch {
            // Malformed JSON-LD on a real page - skip it, don't fail the crawl over it.
        }
    });
    return found;
}
function extractFromHtml(html, baseUrl) {
    const $ = cheerio.load(html);
    const emails = new Set();
    const phones = new Set();
    const social = new Set();
    $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const address = href.replace(/^mailto:/i, '').split('?')[0].trim();
        if (address)
            emails.add(address.toLowerCase());
    });
    $('a[href^="tel:"]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const number = href.replace(/^tel:/i, '').trim();
        if (number)
            phones.add(number);
    });
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        if (SOCIAL_HOST_PATTERN.test(href))
            social.add(href);
    });
    const bodyText = $('body').text();
    for (const match of bodyText.matchAll(EMAIL_REGEX))
        emails.add(match[0].toLowerCase());
    for (const match of bodyText.matchAll(PHONE_REGEX)) {
        const digits = match[0].replace(/\D/g, '');
        if (digits.length >= 8)
            phones.add(match[0].trim());
    }
    const navLinks = [];
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        if (SECONDARY_PATH_PATTERN.test(href)) {
            try {
                navLinks.push(new URL(href, baseUrl).toString());
            }
            catch {
                // Relative/malformed href on a real page - skip it.
            }
        }
    });
    // Tech-stack signal: third-party <script src> hostnames already present
    // in the raw HTML this actor fetched anyway - no separate BuiltWith-style
    // lookup, per this actor's design spec.
    const scriptSources = new Set();
    $('script[src]').each((_, el) => {
        const src = $(el).attr('src') ?? '';
        try {
            const host = new URL(src, baseUrl).hostname;
            scriptSources.add(host);
        }
        catch {
            // Relative/malformed script src - skip it.
        }
    });
    return {
        emails: [...emails],
        phones: [...phones],
        social: [...social],
        jsonLdLocalBusiness: extractJsonLdLocalBusiness($),
        navLinks: [...new Set(navLinks)],
        textLength: bodyText.trim().length,
        pageText: bodyText.replace(/\s+/g, ' ').trim().slice(0, 4000),
        scriptSources: [...scriptSources],
    };
}
const UNAVAILABLE_RESULT = {
    finalUrl: null,
    emailsFound: [],
    phones: [],
    socialLinks: [],
    websiteContentUnavailable: true,
    jsonLdLocalBusiness: null,
    secondaryPageFetched: null,
    pageText: '',
    scriptSources: [],
};
/**
 * Step 2 of the waterfall: plain fetch()+cheerio against the business's own
 * homepage plus one secondary page (contact/about/careers, if linked from
 * the homepage's own nav). Respects robots.txt. Degrades gracefully
 * (`websiteContentUnavailable: true`) on a JS-rendered SPA - this actor
 * never escalates to a headless browser, matching the fleet's stated
 * "no headful fallback" doctrine.
 */
export async function crawlWebsite(rawWebsite) {
    const url = normalizeUrl(rawWebsite);
    let origin;
    try {
        origin = new URL(url).origin;
    }
    catch {
        return UNAVAILABLE_RESULT;
    }
    if (await isDisallowedByRobots(origin)) {
        return UNAVAILABLE_RESULT;
    }
    let homepageResponse;
    try {
        homepageResponse = await fetchWithRetry(url, { maxRetries: 2 });
    }
    catch {
        return UNAVAILABLE_RESULT;
    }
    if (!homepageResponse.ok) {
        return UNAVAILABLE_RESULT;
    }
    const finalUrl = homepageResponse.url || url;
    const homepageHtml = await homepageResponse.text();
    const homepageData = extractFromHtml(homepageHtml, finalUrl);
    // A JS-rendered SPA typically ships a near-empty <body> in the raw HTML
    // response (the framework mounts content client-side); a short text
    // length with no JSON-LD is this actor's signal to degrade gracefully
    // rather than escalate to a headless browser.
    const isSpaLike = homepageData.textLength < 40 && !homepageData.jsonLdLocalBusiness;
    let secondaryPageFetched = null;
    let secondaryEmails = [];
    let secondaryPhones = [];
    let secondarySocial = [];
    let secondaryJsonLd = null;
    let secondaryText = '';
    let secondaryScriptSources = [];
    if (!isSpaLike && homepageData.navLinks.length > 0) {
        const secondaryUrl = homepageData.navLinks[0];
        try {
            const secondaryResponse = await fetchWithRetry(secondaryUrl, { maxRetries: 1 });
            if (secondaryResponse.ok) {
                secondaryPageFetched = secondaryUrl;
                const secondaryHtml = await secondaryResponse.text();
                const secondaryData = extractFromHtml(secondaryHtml, secondaryUrl);
                secondaryEmails = secondaryData.emails;
                secondaryPhones = secondaryData.phones;
                secondarySocial = secondaryData.social;
                secondaryJsonLd = secondaryData.jsonLdLocalBusiness;
                secondaryText = secondaryData.pageText;
                secondaryScriptSources = secondaryData.scriptSources;
            }
        }
        catch {
            // Secondary page failing is non-fatal - homepage data still stands.
        }
    }
    return {
        finalUrl,
        emailsFound: [...new Set([...homepageData.emails, ...secondaryEmails])],
        phones: [...new Set([...homepageData.phones, ...secondaryPhones])],
        socialLinks: [...new Set([...homepageData.social, ...secondarySocial])],
        websiteContentUnavailable: isSpaLike,
        jsonLdLocalBusiness: homepageData.jsonLdLocalBusiness ?? secondaryJsonLd,
        secondaryPageFetched,
        pageText: [homepageData.pageText, secondaryText].filter(Boolean).join(' ').slice(0, 4000),
        scriptSources: [...new Set([...homepageData.scriptSources, ...secondaryScriptSources])],
    };
}
//# sourceMappingURL=websiteCrawl.js.map