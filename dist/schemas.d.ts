import { z } from 'zod';
export declare const DiscoveryModeSchema: z.ZodEnum<["seedList", "osmOverpass"]>;
export type DiscoveryMode = z.infer<typeof DiscoveryModeSchema>;
export declare const ActorInputSchema: z.ZodObject<{
    discoveryMode: z.ZodDefault<z.ZodEnum<["seedList", "osmOverpass"]>>;
    seedList: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    overpassBbox: z.ZodOptional<z.ZodString>;
    maxLeads: z.ZodDefault<z.ZodNumber>;
    includeIntentScore: z.ZodDefault<z.ZodBoolean>;
    hunterApiKey: z.ZodOptional<z.ZodString>;
    peopleDataLabsApiKey: z.ZodOptional<z.ZodString>;
    skipKnownLeads: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    seedList: string[];
    discoveryMode: "seedList" | "osmOverpass";
    maxLeads: number;
    includeIntentScore: boolean;
    skipKnownLeads: boolean;
    overpassBbox?: string | undefined;
    hunterApiKey?: string | undefined;
    peopleDataLabsApiKey?: string | undefined;
}, {
    seedList?: string[] | undefined;
    discoveryMode?: "seedList" | "osmOverpass" | undefined;
    overpassBbox?: string | undefined;
    maxLeads?: number | undefined;
    includeIntentScore?: boolean | undefined;
    hunterApiKey?: string | undefined;
    peopleDataLabsApiKey?: string | undefined;
    skipKnownLeads?: boolean | undefined;
}>;
export type ActorInput = z.infer<typeof ActorInputSchema>;
/** The fleet's confirmed event_type vocabulary. Free-form string in the real SDK type
 * (`UmsEventType | (string & {})`) so other actors can extend it - this actor only ever emits NEW_LISTING. */
export declare const UMS_EVENT_TYPES: readonly ["NEW_LISTING", "AWARD_VARIATION", "UPDATED", "SANCTION", "SNAPSHOT_NO_DIFF"];
export declare const ByokEnrichmentSchema: z.ZodNullable<z.ZodObject<{
    hunterIo: z.ZodNullable<z.ZodObject<{
        used: z.ZodBoolean;
        data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        error: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    }, {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    }>>;
    peopleDataLabs: z.ZodNullable<z.ZodObject<{
        used: z.ZodBoolean;
        data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        error: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    }, {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    }>>;
}, "strip", z.ZodTypeAny, {
    hunterIo: {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    } | null;
    peopleDataLabs: {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    } | null;
}, {
    hunterIo: {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    } | null;
    peopleDataLabs: {
        error: string | null;
        used: boolean;
        data: Record<string, unknown> | null;
    } | null;
}>>;
export declare const EmailPlausibilityMethodSchema: z.ZodNullable<z.ZodEnum<["mx_record_present", "null_mx", "mx_lookup_failed", "no_domain"]>>;
/** The full record this actor emits: the 18 UMS base fields plus its own extension fields. */
export declare const UnifiedRecordSchema: z.ZodObject<{
    record_id: z.ZodString;
    event_type: z.ZodString;
    scraped_at: z.ZodString;
    is_new: z.ZodNullable<z.ZodBoolean>;
    source_url: z.ZodNullable<z.ZodString>;
    recipient_or_defendant_name: z.ZodNullable<z.ZodString>;
    entity_identifier_native: z.ZodNullable<z.ZodString>;
    value_native: z.ZodNullable<z.ZodString>;
    value_currency: z.ZodNullable<z.ZodString>;
    value_usd_normalized: z.ZodNullable<z.ZodNumber>;
    effective_date_iso: z.ZodNullable<z.ZodString>;
    publish_date_iso: z.ZodNullable<z.ZodString>;
    category_or_type: z.ZodNullable<z.ZodString>;
    status_or_estado: z.ZodNullable<z.ZodString>;
    awarding_or_regulating_agency: z.ZodNullable<z.ZodString>;
    jurisdiction: z.ZodString;
    source_document_url: z.ZodNullable<z.ZodString>;
    reference_number: z.ZodNullable<z.ZodString>;
} & {
    discoverySource: z.ZodEnum<["seedList", "osm"]>;
    website: z.ZodNullable<z.ZodString>;
    emailsFound: z.ZodArray<z.ZodString, "many">;
    emailPlausible: z.ZodNullable<z.ZodBoolean>;
    emailPlausibilityMethod: z.ZodNullable<z.ZodEnum<["mx_record_present", "null_mx", "mx_lookup_failed", "no_domain"]>>;
    websiteContentUnavailable: z.ZodBoolean;
    byokEnrichment: z.ZodNullable<z.ZodObject<{
        hunterIo: z.ZodNullable<z.ZodObject<{
            used: z.ZodBoolean;
            data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            error: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        }, {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        }>>;
        peopleDataLabs: z.ZodNullable<z.ZodObject<{
            used: z.ZodBoolean;
            data: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            error: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        }, {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hunterIo: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
        peopleDataLabs: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
    }, {
        hunterIo: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
        peopleDataLabs: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
    }>>;
    intentScore: z.ZodNullable<z.ZodNumber>;
    intentScoreRationale: z.ZodNullable<z.ZodString>;
    intentScoreDisclaimer: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    website: string | null;
    emailPlausible: boolean | null;
    emailPlausibilityMethod: "mx_record_present" | "null_mx" | "mx_lookup_failed" | "no_domain" | null;
    intentScore: number | null;
    intentScoreRationale: string | null;
    intentScoreDisclaimer: string | null;
    websiteContentUnavailable: boolean;
    emailsFound: string[];
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: string;
    source_document_url: string | null;
    reference_number: string | null;
    discoverySource: "seedList" | "osm";
    byokEnrichment: {
        hunterIo: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
        peopleDataLabs: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
    } | null;
}, {
    website: string | null;
    emailPlausible: boolean | null;
    emailPlausibilityMethod: "mx_record_present" | "null_mx" | "mx_lookup_failed" | "no_domain" | null;
    intentScore: number | null;
    intentScoreRationale: string | null;
    intentScoreDisclaimer: string | null;
    websiteContentUnavailable: boolean;
    emailsFound: string[];
    record_id: string;
    event_type: string;
    scraped_at: string;
    is_new: boolean | null;
    source_url: string | null;
    recipient_or_defendant_name: string | null;
    entity_identifier_native: string | null;
    value_native: string | null;
    value_currency: string | null;
    value_usd_normalized: number | null;
    effective_date_iso: string | null;
    publish_date_iso: string | null;
    category_or_type: string | null;
    status_or_estado: string | null;
    awarding_or_regulating_agency: string | null;
    jurisdiction: string;
    source_document_url: string | null;
    reference_number: string | null;
    discoverySource: "seedList" | "osm";
    byokEnrichment: {
        hunterIo: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
        peopleDataLabs: {
            error: string | null;
            used: boolean;
            data: Record<string, unknown> | null;
        } | null;
    } | null;
}>;
export type UnifiedRecord = z.infer<typeof UnifiedRecordSchema>;
//# sourceMappingURL=schemas.d.ts.map