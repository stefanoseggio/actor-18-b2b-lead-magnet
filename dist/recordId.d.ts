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
export declare function computeRecordId(discoverySource: 'seedList' | 'osm', nativeId: string | null, name: string, website: string | null): string;
//# sourceMappingURL=recordId.d.ts.map