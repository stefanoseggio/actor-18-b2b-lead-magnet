import { computeRecordId } from './recordId.js';
import { UnifiedRecordSchema } from './schemas.js';
/**
 * Pure function: raw enrichment-waterfall output -> a validated UMS record.
 * All 18 UMS base fields are always present, nulled where genuinely not
 * applicable to a B2B lead (this actor has no monetary value, agency, or
 * status concept) rather than invented. Validated against UnifiedRecordSchema
 * before returning, so a caller can trust the shape without re-checking it.
 */
export function normalizeToUms(input) {
    const isOsm = input.discoverySource === 'osm';
    const record = {
        record_id: computeRecordId(input.discoverySource, input.nativeId, input.name, input.website),
        event_type: 'NEW_LISTING',
        scraped_at: input.scrapedAt.toISOString(),
        is_new: input.isNew,
        source_url: input.sourceUrl,
        recipient_or_defendant_name: input.name || null,
        entity_identifier_native: isOsm ? input.nativeId : null,
        value_native: null,
        value_currency: null,
        value_usd_normalized: null,
        effective_date_iso: null,
        publish_date_iso: null,
        category_or_type: isOsm ? 'business_listing_osm' : 'business_listing_seed',
        status_or_estado: null,
        awarding_or_regulating_agency: null,
        jurisdiction: isOsm ? 'OSM' : 'GLOBAL',
        source_document_url: null,
        reference_number: null,
        discoverySource: input.discoverySource,
        website: input.website,
        emailsFound: input.emailsFound,
        emailPlausible: input.emailPlausible,
        emailPlausibilityMethod: input.emailPlausibilityMethod,
        websiteContentUnavailable: input.websiteContentUnavailable,
        byokEnrichment: input.byokEnrichment,
        intentScore: input.intentScore,
        intentScoreRationale: input.intentScoreRationale,
        intentScoreDisclaimer: input.intentScoreDisclaimer,
    };
    return UnifiedRecordSchema.parse(record);
}
//# sourceMappingURL=umsNormalizer.js.map