import { Actor, log } from 'apify';

import { discoverViaOverpass } from './discovery/overpass.js';
import { parseSeedList } from './discovery/seedList.js';
import { runByokEnrichment } from './enrichment/byok.js';
import { checkEmailPlausibility } from './enrichment/dnsCheck.js';
import { computeIntentScore } from './enrichment/intentScore.js';
import { crawlWebsite, extractDomain, type WebsiteCrawlResult } from './enrichment/websiteCrawl.js';
import { computeRecordId } from './recordId.js';
import { type ActorInput,ActorInputSchema } from './schemas.js';
import { loadState, saveState, type SeenLeadsState } from './state.js';
import { normalizeToUms } from './umsNormalizer.js';

// Two distinct PPE event names, never blended into one flat rate - the LLM
// step is ~7x the rest of the waterfall's cost, so blending would silently
// break the margin on every basic (non-LLM) record. See
// reports/institutional-strategy-feasibility-2026.md §2.1.5:
// Basic Lead ~$0.000263/record cost -> $0.002/record price (~86.84% margin).
// Enriched Lead ~$0.002013/record cost -> $0.015/record price (~86.58% margin).
const BASIC_LEAD_EVENT = 'basic_lead';
const ENRICHED_LEAD_EVENT = 'enriched_lead';

const UNAVAILABLE_CRAWL: WebsiteCrawlResult = {
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

interface Candidate {
    discoverySource: 'seedList' | 'osm';
    name: string;
    website: string | null;
    nativeId: string | null;
}

await Actor.init();
await run();
await Actor.exit();

async function run(): Promise<void> {
    const rawInput = (await Actor.getInput<Partial<ActorInput>>()) ?? {};
    const parsedInput = ActorInputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
        const message = `Invalid actor input: ${parsedInput.error.message}`;
        log.error(message);
        await Actor.pushData({ error: message, scraped_at: new Date().toISOString() });
        return;
    }
    const input = parsedInput.data;
    const runAt = new Date().toISOString();
    const state = await loadState();
    const newlySeenIds: string[] = [];

    try {
        const candidates = await discoverCandidates(input, state);
        log.info(`Discovered ${candidates.length} candidate(s) via discoveryMode="${input.discoveryMode}".`);

        let pushed = 0;
        let skipped = 0;
        for (const candidate of candidates.slice(0, input.maxLeads)) {
            const recordId = computeRecordId(candidate.discoverySource, candidate.nativeId, candidate.name, candidate.website);
            const alreadySeen = Object.prototype.hasOwnProperty.call(state.seen, recordId);

            // skipKnownLeads is opt-in and defaults to false (fully backward
            // compatible): when enabled, a lead already discovered and
            // charged for in a prior run is skipped BEFORE the expensive
            // enrichment waterfall runs (website crawl, DNS check, optional
            // BYOK providers, optional Claude intent scoring) - this both
            // avoids double-charging PPE for the same business and saves
            // real compute cost, not just billing.
            if (input.skipKnownLeads && alreadySeen) {
                skipped += 1;
                continue;
            }

            const record = await enrichCandidate(candidate, input, !alreadySeen);
            await Actor.pushData(record);
            pushed += 1;
            newlySeenIds.push(recordId);

            const eventName = input.includeIntentScore ? ENRICHED_LEAD_EVENT : BASIC_LEAD_EVENT;
            const { eventChargeLimitReached } = await Actor.charge({ eventName, count: 1 });
            if (eventChargeLimitReached) {
                log.info(`Charge limit reached for event "${eventName}" - stopping after ${pushed} record(s).`);
                await saveState(state, newlySeenIds, runAt);
                return;
            }
        }

        await saveState(state, newlySeenIds, runAt);
        log.info(`Done. Pushed ${pushed} record(s), skipped ${skipped} already-known lead(s) (skipKnownLeads=${input.skipKnownLeads}).`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Actor run failed: ${message}`);
        await Actor.pushData({ error: message, scraped_at: new Date().toISOString() });
    }
}

async function discoverCandidates(input: ActorInput, state: SeenLeadsState): Promise<Candidate[]> {
    if (input.discoveryMode === 'osmOverpass') {
        if (!input.overpassBbox) {
            throw new Error('overpassBbox is required when discoveryMode is "osmOverpass".');
        }
        // Windowing, not real pagination: excluding every osm-sourced id
        // already in state.seen (regardless of skipKnownLeads, and
        // regardless of which bbox first recorded it - an id lookup is
        // precise, so a stale id from a different bbox simply never
        // matches this one's query) is what lets a repeat run on an
        // unchanged bbox reach further into Overpass's own result order
        // instead of re-matching the same leading subset every time. See
        // discoverViaOverpass's doc comment for what this does and doesn't
        // fix.
        const excludeOsmIds = Object.keys(state.seen)
            .filter((recordId) => recordId.startsWith('osm:'))
            .map((recordId) => recordId.slice('osm:'.length));
        const osmCandidates = await discoverViaOverpass(input.overpassBbox, input.maxLeads, excludeOsmIds);
        return osmCandidates.map((c) => ({
            discoverySource: 'osm' as const,
            name: c.name,
            website: c.website,
            nativeId: c.osmId,
        }));
    }

    if (!input.seedList || input.seedList.length === 0) {
        throw new Error('seedList must contain at least one URL/entry when discoveryMode is "seedList".');
    }

    return parseSeedList(input.seedList).map((c) => ({
        discoverySource: 'seedList' as const,
        name: c.name,
        website: c.website,
        nativeId: null,
    }));
}

async function enrichCandidate(candidate: Candidate, input: ActorInput, isNew: boolean) {
    const scrapedAt = new Date();

    let crawl: WebsiteCrawlResult = UNAVAILABLE_CRAWL;
    const domain = candidate.website ? extractDomain(candidate.website) : null;

    if (candidate.website) {
        try {
            crawl = await crawlWebsite(candidate.website);
        } catch (error) {
            log.warning(
                `Website crawl failed for ${candidate.website}: ${error instanceof Error ? error.message : String(error)}`,
            );
            crawl = UNAVAILABLE_CRAWL;
        }
    }

    const emailDomainFromFinding = crawl.emailsFound[0]?.split('@')[1] ?? null;
    const dnsResult = await checkEmailPlausibility(emailDomainFromFinding ?? domain);

    const byok = await runByokEnrichment(domain, input.hunterApiKey, input.peopleDataLabsApiKey);

    let intentScore: number | null = null;
    let intentScoreRationale: string | null = null;
    let intentScoreDisclaimer: string | null = null;

    if (input.includeIntentScore) {
        const crawledText = buildCrawledText(candidate.name, crawl);
        const result = await computeIntentScore(crawledText, process.env.ANTHROPIC_API_KEY);
        intentScore = result.intentScore;
        intentScoreRationale = result.intentScoreRationale;
        intentScoreDisclaimer = result.intentScoreDisclaimer;
    }

    return normalizeToUms({
        discoverySource: candidate.discoverySource,
        name: candidate.name,
        website: candidate.website,
        sourceUrl: candidate.website,
        nativeId: candidate.nativeId,
        scrapedAt,
        emailsFound: crawl.emailsFound,
        emailPlausible: dnsResult.emailPlausible,
        emailPlausibilityMethod: dnsResult.emailPlausibilityMethod,
        websiteContentUnavailable: crawl.websiteContentUnavailable,
        byokEnrichment: byok,
        intentScore,
        intentScoreRationale,
        intentScoreDisclaimer,
        isNew,
    });
}

function buildCrawledText(name: string, crawl: WebsiteCrawlResult): string {
    const jsonLd = crawl.jsonLdLocalBusiness ? JSON.stringify(crawl.jsonLdLocalBusiness) : '';
    const scriptSources = crawl.scriptSources.length > 0 ? `Third-party scripts: ${crawl.scriptSources.join(', ')}` : '';
    const social = crawl.socialLinks.length > 0 ? `Social links: ${crawl.socialLinks.join(', ')}` : '';
    return [`Business name: ${name}`, crawl.pageText, jsonLd, scriptSources, social].filter(Boolean).join('\n');
}
