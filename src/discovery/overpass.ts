import { fetchWithRetry } from '../http.js';

export interface OverpassCandidate {
    /** Raw OSM type/id, e.g. "node/48213456" - no scheme prefix (the "osm:" prefix is added at UMS-normalization time as part of record_id). */
    osmId: string;
    name: string;
    website: string | null;
    tags: Record<string, string>;
}

// Production volume should budget a self-hosted Overpass instance; the
// public overpass-api.de mirror is fair-use only - documented explicitly in
// reports/institutional-strategy-feasibility-2026.md §2.1.0, which also
// records the underlying legal reasoning for using OSM here at all: OSM's
// ODbL license explicitly permits building a business-listings database
// from its data, unlike Google's Maps/Earth Additional ToS and Maps
// Platform ToS, which both explicitly prohibit exactly that use.
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

// Verbatim from this actor's design spec - the "(bbox)" token is a literal
// placeholder substituted in buildOverpassQuery(), not real Overpass QL
// syntax on its own.
const OVERPASS_MATCH_CLAUSE = `
  node["shop"]["name"]["website"](bbox);
  node["office"]["name"]["website"](bbox);
  way["craft"]["name"]["website"](bbox);
`;

/**
 * Groups "type/id" strings (this actor's own osmId shape, e.g. "node/123")
 * by their OSM element type, e.g. { node: ["123"], way: ["456"] } - the
 * shape Overpass QL's own `type(id:...)` id-list selector needs.
 */
function groupOsmIdsByType(osmIds: string[]): Map<string, string[]> {
    const byType = new Map<string, string[]>();
    for (const osmId of osmIds) {
        const [type, id] = osmId.split('/', 2);
        if (!type || !id) continue; // defensively skip anything not in this actor's own "type/id" shape
        const ids = byType.get(type) ?? [];
        ids.push(id);
        byType.set(type, ids);
    }
    return byType;
}

/**
 * `excludeOsmIds` (this actor's own "type/id" osmId shape, e.g. "node/123")
 * subtracts those specific elements from the match set via Overpass QL's
 * difference operator (`a; - b;`), evaluated server-side before the
 * response is ever sent back. This is a windowing improvement, not real
 * offset/cursor pagination: a single run is still capped at the first
 * `limit` matches in whatever order Overpass returns them (see the
 * `discoverViaOverpass` doc comment and README.md's "OSM Overpass discovery
 * order" section for what this does and doesn't fix). Passing the
 * record_ids already persisted in `state.seen` (src/state.ts) here is what
 * lets a repeat `skipKnownLeads:true` run on an unchanged bbox actually
 * reach businesses past the previous run's leading subset, instead of
 * re-fetching (and then skipping) the exact same elements every time.
 */
export function buildOverpassQuery(bbox: string, excludeOsmIds: string[] = []): string {
    const matchClause = OVERPASS_MATCH_CLAUSE.replace(/\(bbox\)/g, `(${bbox})`);
    if (excludeOsmIds.length === 0) {
        return `[out:json][timeout:25];\n(\n${matchClause}\n);\nout center;`;
    }

    const excludeByType = groupOsmIdsByType(excludeOsmIds);
    const excludeClauses = Array.from(excludeByType.entries())
        .map(([type, ids]) => `  ${type}(id:${ids.join(',')});`)
        .join('\n');

    return `[out:json][timeout:25];\n(\n  (\n${matchClause}\n  );\n  -\n  (\n${excludeClauses}\n  );\n);\nout center;`;
}

interface OverpassElement {
    type: string;
    id: number;
    tags?: Record<string, string>;
}

interface OverpassApiResponse {
    elements?: OverpassElement[];
}

function hasContactTag(tags: Record<string, string>): boolean {
    return Object.keys(tags).some((key) => key.startsWith('contact:'));
}

/**
 * Mode B discovery: OpenStreetMap Overpass API within a bounding box. A
 * `website` (or any `contact:*`) tag is required for a candidate to
 * proceed - the entry condition that keeps this actor from ever emitting a
 * lead with no plausible way to reach the business. Results are capped at
 * `limit` (this actor's own maxLeads input), not just Overpass's own cap.
 *
 * There is no offset/cursor pagination of Overpass's own results: within a
 * single call, Overpass has no stable "page 2" concept for an ad hoc tag
 * query like this one, so a bbox with more qualifying elements than `limit`
 * will always have some elements this actor never reaches in a single run,
 * in whatever order Overpass happens to return them (its own internal
 * storage order - not sorted by relevance, distance, or recency). What
 * `excludeOsmIds` DOES fix (see buildOverpassQuery's doc comment): a
 * *repeat* run against the same bbox, passed the OSM ids already recorded
 * in `state.seen`, no longer keeps re-matching that same leading subset
 * forever - each server-side-filtered call progresses further into the
 * bbox's real result set. See README.md's "OSM Overpass discovery order"
 * section for the caller-facing explanation and the recommended
 * `skipKnownLeads:true` recurring-run pattern this enables.
 */
export async function discoverViaOverpass(bbox: string, limit: number, excludeOsmIds: string[] = []): Promise<OverpassCandidate[]> {
    const query = buildOverpassQuery(bbox, excludeOsmIds);
    const response = await fetchWithRetry(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
        maxRetries: 2,
    });
    if (!response.ok) {
        throw new Error(`Overpass API returned HTTP ${response.status}`);
    }

    const json = (await response.json()) as OverpassApiResponse;
    const elements = json.elements ?? [];

    const candidates: OverpassCandidate[] = [];
    for (const element of elements) {
        const tags = element.tags ?? {};
        if (!tags.name) continue;

        const website = tags.website ?? tags['contact:website'] ?? null;
        if (!website && !hasContactTag(tags)) continue;

        candidates.push({
            osmId: `${element.type}/${element.id}`,
            name: tags.name,
            website,
            tags,
        });
        if (candidates.length >= limit) break;
    }

    return candidates;
}
