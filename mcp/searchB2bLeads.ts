/**
 * MCP tool spec for `search_b2b_leads`, registering Actor 18 ("Universal B2B
 * Lead Magnet & Intent Enricher") into the fleet's MCP gateway.
 *
 * Mirrors the real registration shape verified this session in
 * services/mcp-gateway/src/mcp/tools/searchGovernmentTenders.ts +
 * services/mcp-gateway/src/mcp/tools/registry.ts: a zod input schema,
 * TOOL_NAME (snake_case), `description`, `inputSchema` (the zod schema
 * itself), `jsonSchema` derived from it via zod-to-json-schema (not
 * hand-duplicated), and an async `handler(input, ctx)`.
 *
 * This file is a standalone spec/payload only, living entirely inside this
 * actor's own directory - it is NOT wired into
 * services/mcp-gateway/src/mcp/tools/registry.ts (that array, and the
 * ToolContext shape it depends on - QueryRouter, ApiKeyRecord, etc. - belong
 * to services/mcp-gateway and are out of this actor's repo boundary).
 * Registering it there is a separate task. The `ToolContext` below is
 * therefore a minimal, duck-typed interface this actor's own handler needs,
 * not an import of the gateway's real one.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const TOOL_NAME = 'search_b2b_leads';

export const description =
    "Discovers and enriches B2B leads via Actor 18's two supported discovery modes: a customer-supplied seed list of company names/domains (zero discovery-layer risk), or OpenStreetMap Overpass discovery within a bounding box (ODbL-licensed - Google Maps is intentionally excluded from discovery because its Maps/Earth Additional ToS and Maps Platform ToS both prohibit building a business-listings/mailing-list database from Maps content). Every returned record carries a free DNS/MX email-plausibility signal (emailPlausible/emailPlausibilityMethod). include_intent_score additionally requests a heuristic Claude Haiku 4.5 buying-intent read of the business's own public site text - always accompanied by its mandatory intentScoreDisclaimer field, never presented as a verified fact. Optional hunter_api_key/people_data_labs_api_key are BYOK: that vendor bills the caller's own account directly, never this tool's own price. Billed on two distinct PPE events, never one blended rate - basic_lead ($0.002/record) without intent scoring, enriched_lead ($0.015/record) with it, since the LLM step is roughly 7x the rest of the waterfall's cost.";

export const searchB2bLeadsInputSchema = z.object({
    discovery_mode: z
        .enum(['seedList', 'osmOverpass'])
        .default('seedList')
        .describe(
            'seedList: enrich the company names/domains in seed_list directly. osmOverpass: discover candidates from OpenStreetMap Overpass within overpass_bbox.',
        ),
    seed_list: z
        .array(z.string().min(1))
        .optional()
        .describe('Company names or website domains/URLs to enrich directly. Required (non-empty) when discovery_mode is "seedList".'),
    overpass_bbox: z
        .string()
        .optional()
        .describe('Bounding box "south,west,north,east" (decimal degrees) for OSM Overpass discovery. Required when discovery_mode is "osmOverpass".'),
    max_leads: z.coerce.number().int().min(1).max(5000).default(50).describe('Hard cap on leads returned this call.'),
    include_intent_score: z.coerce
        .boolean()
        .default(false)
        .describe(
            'When true, bills the enriched_lead PPE event and adds a heuristic Claude Haiku 4.5 intent score (with mandatory disclaimer) per lead instead of basic_lead.',
        ),
    hunter_api_key: z
        .string()
        .optional()
        .describe("Caller's own Hunter.io API key (BYOK). When present, Hunter.io bills the caller directly - this tool's own price never absorbs that cost."),
    people_data_labs_api_key: z
        .string()
        .optional()
        .describe("Caller's own People Data Labs API key (BYOK), billed the same way as hunter_api_key."),
});

export type SearchB2bLeadsInput = z.infer<typeof searchB2bLeadsInputSchema>;

export const inputSchema = searchB2bLeadsInputSchema;
/** Real JSON Schema derived from the single zod source above - not hand-duplicated, mirrors the fleet's own pattern. */
export const jsonSchema = zodToJsonSchema(searchB2bLeadsInputSchema, TOOL_NAME);

export interface SearchB2bLeadsOutput {
    query_id: string;
    result_count: number;
    billed_event: 'basic_lead' | 'enriched_lead';
    records: unknown[];
}

/**
 * Minimal duck-typed dependency this handler needs to actually invoke the
 * actor and read its dataset back - satisfied on the gateway side by an
 * apify-client-backed implementation (mirroring services/mcp-gateway's own
 * QueryRouter pattern). Kept local rather than imported so this file stays a
 * standalone, dependency-light spec that does not reach into
 * services/mcp-gateway.
 */
export interface ActorRunCaller {
    runActorAndGetItems(actorId: string, input: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}

export interface ToolContext {
    actorCaller: ActorRunCaller;
    /** The Apify Store id this actor is published under, e.g. "stefano_seggio/actor-18-b2b-lead-magnet". */
    actorId: string;
}

let queryCounter = 0;

export async function handler(input: SearchB2bLeadsInput, ctx: ToolContext): Promise<SearchB2bLeadsOutput> {
    if (input.discovery_mode === 'seedList' && (!input.seed_list || input.seed_list.length === 0)) {
        throw new Error('seed_list must be non-empty when discovery_mode is "seedList".');
    }
    if (input.discovery_mode === 'osmOverpass' && !input.overpass_bbox) {
        throw new Error('overpass_bbox is required when discovery_mode is "osmOverpass".');
    }

    const records = await ctx.actorCaller.runActorAndGetItems(ctx.actorId, {
        discoveryMode: input.discovery_mode,
        seedList: input.seed_list ?? [],
        overpassBbox: input.overpass_bbox,
        maxLeads: input.max_leads,
        includeIntentScore: input.include_intent_score,
        hunterApiKey: input.hunter_api_key,
        peopleDataLabsApiKey: input.people_data_labs_api_key,
    });

    queryCounter += 1;
    return {
        query_id: `qry_b2b_${Date.now().toString(36)}_${queryCounter}`,
        result_count: records.length,
        billed_event: input.include_intent_score ? 'enriched_lead' : 'basic_lead',
        records,
    };
}
