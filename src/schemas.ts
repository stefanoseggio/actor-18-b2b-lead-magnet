import { z } from 'zod';

// ---------------------------------------------------------------------------
// Actor input
// ---------------------------------------------------------------------------

export const DiscoveryModeSchema = z.enum(['seedList', 'osmOverpass']);
export type DiscoveryMode = z.infer<typeof DiscoveryModeSchema>;

// Timeout-budget cap, not an arbitrary round number: see .actor/input_schema.json's
// maxLeads description and the fix commit for the full worst-case arithmetic
// against src/http.ts's fetchWithRetry retry/backoff constants and this
// Actor's real defaultRunOptions.timeoutSecs=3600s.
export const MAX_LEADS_CAP = 500;

export const ActorInputSchema = z.object({
    discoveryMode: DiscoveryModeSchema.default('seedList'),
    seedList: z.array(z.string()).default([]),
    overpassBbox: z.string().optional(),
    maxLeads: z.number().int().min(1).max(MAX_LEADS_CAP).default(50),
    includeIntentScore: z.boolean().default(false),
    hunterApiKey: z.string().min(1).optional(),
    peopleDataLabsApiKey: z.string().min(1).optional(),
    skipKnownLeads: z.boolean().default(false),
});
export type ActorInput = z.infer<typeof ActorInputSchema>;

// ---------------------------------------------------------------------------
// Unified Master Schema (UMS) -- 18 fields, verbatim from
// services/enterprise-sdks/node/src/types.ts (UnifiedRecord). Every record
// this actor outputs carries all 18, nulling any that don't apply to a B2B
// lead rather than inventing a value.
// ---------------------------------------------------------------------------

/** The fleet's confirmed event_type vocabulary. Free-form string in the real SDK type
 * (`UmsEventType | (string & {})`) so other actors can extend it - this actor only ever emits NEW_LISTING. */
export const UMS_EVENT_TYPES = ['NEW_LISTING', 'AWARD_VARIATION', 'UPDATED', 'SANCTION', 'SNAPSHOT_NO_DIFF'] as const;

const UmsBaseSchema = z.object({
    record_id: z.string().min(1),
    event_type: z.string().min(1),
    scraped_at: z.string().min(1),
    is_new: z.boolean().nullable(),
    source_url: z.string().nullable(),
    recipient_or_defendant_name: z.string().nullable(),
    entity_identifier_native: z.string().nullable(),
    value_native: z.string().nullable(),
    value_currency: z.string().nullable(),
    value_usd_normalized: z.number().nullable(),
    effective_date_iso: z.string().nullable(),
    publish_date_iso: z.string().nullable(),
    category_or_type: z.string().nullable(),
    status_or_estado: z.string().nullable(),
    awarding_or_regulating_agency: z.string().nullable(),
    jurisdiction: z.string().min(1),
    source_document_url: z.string().nullable(),
    reference_number: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// This actor's own extension fields (UMS envelope extends, never replaces)
// ---------------------------------------------------------------------------

const ByokProviderResultSchema = z.object({
    used: z.boolean(),
    data: z.record(z.unknown()).nullable(),
    error: z.string().nullable(),
});

export const ByokEnrichmentSchema = z
    .object({
        hunterIo: ByokProviderResultSchema.nullable(),
        peopleDataLabs: ByokProviderResultSchema.nullable(),
    })
    .nullable();

export const EmailPlausibilityMethodSchema = z
    .enum(['mx_record_present', 'null_mx', 'mx_lookup_failed', 'no_domain'])
    .nullable();

/** The full record this actor emits: the 18 UMS base fields plus its own extension fields. */
export const UnifiedRecordSchema = UmsBaseSchema.extend({
    discoverySource: z.enum(['seedList', 'osm']),
    website: z.string().nullable(),
    emailsFound: z.array(z.string()),
    emailPlausible: z.boolean().nullable(),
    emailPlausibilityMethod: EmailPlausibilityMethodSchema,
    websiteContentUnavailable: z.boolean(),
    byokEnrichment: ByokEnrichmentSchema,
    intentScore: z.number().min(0).max(100).nullable(),
    intentScoreRationale: z.string().nullable(),
    intentScoreDisclaimer: z.string().nullable(),
});

export type UnifiedRecord = z.infer<typeof UnifiedRecordSchema>;
