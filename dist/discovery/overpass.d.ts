export interface OverpassCandidate {
    /** Raw OSM type/id, e.g. "node/48213456" - no scheme prefix (the "osm:" prefix is added at UMS-normalization time as part of record_id). */
    osmId: string;
    name: string;
    website: string | null;
    tags: Record<string, string>;
}
export declare function buildOverpassQuery(bbox: string): string;
/**
 * Mode B discovery: OpenStreetMap Overpass API within a bounding box. A
 * `website` (or any `contact:*`) tag is required for a candidate to
 * proceed - the entry condition that keeps this actor from ever emitting a
 * lead with no plausible way to reach the business. Results are capped at
 * `limit` (this actor's own maxLeads input), not just Overpass's own cap.
 */
export declare function discoverViaOverpass(bbox: string, limit: number): Promise<OverpassCandidate[]>;
//# sourceMappingURL=overpass.d.ts.map