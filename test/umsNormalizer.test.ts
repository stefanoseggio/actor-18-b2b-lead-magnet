import { describe, expect, it } from 'vitest';

import { normalizeToUms, type NormalizeInput } from '../src/umsNormalizer.js';
import { UnifiedRecordSchema } from '../src/schemas.js';

const UMS_FIELDS = [
    'record_id',
    'event_type',
    'scraped_at',
    'is_new',
    'source_url',
    'recipient_or_defendant_name',
    'entity_identifier_native',
    'value_native',
    'value_currency',
    'value_usd_normalized',
    'effective_date_iso',
    'publish_date_iso',
    'category_or_type',
    'status_or_estado',
    'awarding_or_regulating_agency',
    'jurisdiction',
    'source_document_url',
    'reference_number',
] as const;

const OSM_INPUT: NormalizeInput = {
    discoverySource: 'osm',
    name: 'Acme Corp',
    website: 'https://acme-corp.example',
    sourceUrl: 'https://acme-corp.example',
    nativeId: 'node/48213456',
    scrapedAt: new Date('2026-09-07T00:00:00.000Z'),
    emailsFound: ['info@acme-corp.example'],
    emailPlausible: true,
    emailPlausibilityMethod: 'mx_record_present',
    websiteContentUnavailable: false,
    byokEnrichment: null,
    intentScore: 62,
    intentScoreRationale: 'Careers page lists 3 open roles; HubSpot tag present on homepage.',
    intentScoreDisclaimer: 'Heuristic LLM-derived estimate from public website text only. Not a verified fact.',
    isNew: true,
};

const SEED_INPUT: NormalizeInput = {
    discoverySource: 'seedList',
    name: 'Acme Corp',
    website: null,
    sourceUrl: null,
    nativeId: null,
    scrapedAt: new Date('2026-09-07T00:00:00.000Z'),
    emailsFound: [],
    emailPlausible: null,
    emailPlausibilityMethod: 'no_domain',
    websiteContentUnavailable: true,
    byokEnrichment: null,
    intentScore: null,
    intentScoreRationale: null,
    intentScoreDisclaimer: null,
    isNew: true,
};

describe('normalizeToUms', () => {
    it('produces a record with all 18 UMS fields present for an OSM-discovered candidate', () => {
        const record = normalizeToUms(OSM_INPUT);

        for (const field of UMS_FIELDS) {
            expect(record).toHaveProperty(field);
        }

        expect(record.record_id).toBe('osm:node/48213456');
        expect(record.event_type).toBe('NEW_LISTING');
        expect(record.is_new).toBe(true);
        expect(record.jurisdiction).toBe('OSM');
        expect(record.entity_identifier_native).toBe('node/48213456');
        expect(record.category_or_type).toBe('business_listing_osm');

        // Fields genuinely not applicable to a B2B lead - nulled, never invented.
        expect(record.value_native).toBeNull();
        expect(record.value_currency).toBeNull();
        expect(record.value_usd_normalized).toBeNull();
        expect(record.effective_date_iso).toBeNull();
        expect(record.publish_date_iso).toBeNull();
        expect(record.status_or_estado).toBeNull();
        expect(record.awarding_or_regulating_agency).toBeNull();
        expect(record.source_document_url).toBeNull();
        expect(record.reference_number).toBeNull();

        // Actor-18 extension fields.
        expect(record.discoverySource).toBe('osm');
        expect(record.website).toBe('https://acme-corp.example');
        expect(record.emailsFound).toEqual(['info@acme-corp.example']);
        expect(record.intentScore).toBe(62);
        expect(record.intentScoreDisclaimer).toContain('Not a verified fact');
    });

    it('produces a stable, deterministic record_id for the same seed-list candidate across calls, with null entity_identifier_native and GLOBAL jurisdiction', () => {
        const first = normalizeToUms(SEED_INPUT);
        const second = normalizeToUms(SEED_INPUT);

        expect(first.record_id).toBe(second.record_id);
        expect(first.record_id.startsWith('seed:')).toBe(true);
        expect(first.entity_identifier_native).toBeNull();
        expect(first.jurisdiction).toBe('GLOBAL');
        expect(first.category_or_type).toBe('business_listing_seed');
    });

    it('produces different record_ids for two different seed-list candidates', () => {
        const a = normalizeToUms(SEED_INPUT);
        const b = normalizeToUms({ ...SEED_INPUT, name: 'Beta LLC' });
        expect(a.record_id).not.toBe(b.record_id);
    });

    it('nulls byokEnrichment when neither BYOK provider key was supplied, and never fabricates a value', () => {
        const record = normalizeToUms(SEED_INPUT);
        expect(record.byokEnrichment).toBeNull();
    });

    it('carries a populated byokEnrichment object through untouched when supplied', () => {
        const record = normalizeToUms({
            ...OSM_INPUT,
            byokEnrichment: {
                hunterIo: { used: true, data: { emails: [] }, error: null },
                peopleDataLabs: null,
            },
        });
        expect(record.byokEnrichment?.hunterIo?.used).toBe(true);
        expect(record.byokEnrichment?.peopleDataLabs).toBeNull();
    });

    it('validates against UnifiedRecordSchema directly (round-trip parse) for both discovery sources', () => {
        expect(() => UnifiedRecordSchema.parse(normalizeToUms(OSM_INPUT))).not.toThrow();
        expect(() => UnifiedRecordSchema.parse(normalizeToUms(SEED_INPUT))).not.toThrow();
    });

    it('never invents recipient_or_defendant_name from an empty string', () => {
        const record = normalizeToUms({ ...SEED_INPUT, name: '' });
        expect(record.recipient_or_defendant_name).toBeNull();
    });

    it('passes isNew through unchanged (computed by main.ts against src/state.ts, not recomputed here)', () => {
        expect(normalizeToUms({ ...SEED_INPUT, isNew: true }).is_new).toBe(true);
        expect(normalizeToUms({ ...SEED_INPUT, isNew: false }).is_new).toBe(false);
        expect(normalizeToUms({ ...SEED_INPUT, isNew: null }).is_new).toBeNull();
    });
});
