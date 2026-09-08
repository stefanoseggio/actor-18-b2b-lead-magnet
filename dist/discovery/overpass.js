import { fetchWithRetry } from '../http.js';
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
const OVERPASS_QUERY_TEMPLATE = `[out:json][timeout:25];
(
  node["shop"]["name"]["website"](bbox);
  node["office"]["name"]["website"](bbox);
  way["craft"]["name"]["website"](bbox);
);
out center;`;
export function buildOverpassQuery(bbox) {
    return OVERPASS_QUERY_TEMPLATE.replace(/\(bbox\)/g, `(${bbox})`);
}
function hasContactTag(tags) {
    return Object.keys(tags).some((key) => key.startsWith('contact:'));
}
/**
 * Mode B discovery: OpenStreetMap Overpass API within a bounding box. A
 * `website` (or any `contact:*`) tag is required for a candidate to
 * proceed - the entry condition that keeps this actor from ever emitting a
 * lead with no plausible way to reach the business. Results are capped at
 * `limit` (this actor's own maxLeads input), not just Overpass's own cap.
 */
export async function discoverViaOverpass(bbox, limit) {
    const query = buildOverpassQuery(bbox);
    const response = await fetchWithRetry(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
        maxRetries: 2,
    });
    if (!response.ok) {
        throw new Error(`Overpass API returned HTTP ${response.status}`);
    }
    const json = (await response.json());
    const elements = json.elements ?? [];
    const candidates = [];
    for (const element of elements) {
        const tags = element.tags ?? {};
        if (!tags.name)
            continue;
        const website = tags.website ?? tags['contact:website'] ?? null;
        if (!website && !hasContactTag(tags))
            continue;
        candidates.push({
            osmId: `${element.type}/${element.id}`,
            name: tags.name,
            website,
            tags,
        });
        if (candidates.length >= limit)
            break;
    }
    return candidates;
}
//# sourceMappingURL=overpass.js.map