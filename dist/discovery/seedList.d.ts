export interface SeedListCandidate {
    name: string;
    website: string | null;
}
/**
 * Mode A discovery: customer-supplied seed list. Zero discovery-layer risk -
 * this makes no external request at all, it only parses input the customer
 * already typed. Each entry may be a bare company name ("Acme Corp") or a
 * domain/URL ("acme.com", "https://acme.com/about") - the two are told apart
 * heuristically rather than via a second input field, so a customer can
 * paste one mixed list. De-duplicates on the normalized website (falling
 * back to the lowercased name) so the same business isn't enriched twice.
 */
export declare function parseSeedList(seeds: string[]): SeedListCandidate[];
//# sourceMappingURL=seedList.d.ts.map