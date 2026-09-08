import type { ByokEnrichmentResult } from './enrichment/byok.js';
import type { EmailPlausibilityMethod } from './enrichment/dnsCheck.js';
import { type UnifiedRecord } from './schemas.js';
export interface NormalizeInput {
    discoverySource: 'seedList' | 'osm';
    name: string;
    website: string | null;
    sourceUrl: string | null;
    /** Raw OSM type/id (e.g. "node/48213456") for OSM discovery; null for seed-list leads - no native source id exists for a customer-typed name. */
    nativeId: string | null;
    scrapedAt: Date;
    emailsFound: string[];
    emailPlausible: boolean | null;
    emailPlausibilityMethod: EmailPlausibilityMethod | null;
    websiteContentUnavailable: boolean;
    byokEnrichment: ByokEnrichmentResult | null;
    intentScore: number | null;
    intentScoreRationale: string | null;
    intentScoreDisclaimer: string | null;
    /** Computed by src/main.ts against this actor's own named key-value store (see src/state.ts): true if this record_id was never seen in a prior run, false if it was, null if lead-tracking state wasn't consulted for some reason. Unlike a registry-monitoring actor, this is NOT a richer NEW_LISTING/STATUS_CHANGE/UPDATED/CLOSED classification - a business's own listing doesn't have a "status" this actor can observe, so is_new (seen before or not) is the one real cross-run signal that applies here. */
    isNew: boolean | null;
}
/**
 * Pure function: raw enrichment-waterfall output -> a validated UMS record.
 * All 18 UMS base fields are always present, nulled where genuinely not
 * applicable to a B2B lead (this actor has no monetary value, agency, or
 * status concept) rather than invented. Validated against UnifiedRecordSchema
 * before returning, so a caller can trust the shape without re-checking it.
 */
export declare function normalizeToUms(input: NormalizeInput): UnifiedRecord;
//# sourceMappingURL=umsNormalizer.d.ts.map