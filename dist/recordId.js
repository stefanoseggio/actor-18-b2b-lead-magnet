import { createHash } from 'node:crypto';
/** Deterministic id for a seed-list lead: same name+website in -> same record_id out, across runs. */
function stableSeedRecordId(name, website) {
    const key = `${name.trim().toLowerCase()}|${(website ?? '').trim().toLowerCase()}`;
    const hash = createHash('sha1').update(key).digest('hex').slice(0, 16);
    return `seed:${hash}`;
}
/**
 * The single source of truth for this actor's record_id shape - OSM
 * discovery uses the real, stable osmId (`osm:<id>`); seed-list discovery
 * has no native id, so a stable hash of normalized name+website is used
 * instead (`seed:<hash>`). Shared between src/main.ts (to check
 * skipKnownLeads state BEFORE running the expensive enrichment waterfall,
 * so a known lead is skipped cheaply, not enriched-then-discarded) and
 * src/umsNormalizer.ts (to stamp the same id onto the final record) - a
 * single implementation guarantees they can never drift apart.
 */
export function computeRecordId(discoverySource, nativeId, name, website) {
    return discoverySource === 'osm' && nativeId ? `osm:${nativeId}` : stableSeedRecordId(name, website);
}
//# sourceMappingURL=recordId.js.map