export interface ByokProviderResult {
    used: boolean;
    data: Record<string, unknown> | null;
    error: string | null;
}
export interface ByokEnrichmentResult {
    hunterIo: ByokProviderResult | null;
    peopleDataLabs: ByokProviderResult | null;
}
/**
 * Step 4 of the waterfall: BYOK ("bring your own key") third-party
 * enrichment. When a key is supplied, THIS actor's own code calls
 * Hunter.io/PDL using the customer's key - that third party bills the
 * customer's own account directly, so this actor's own P&L never carries
 * that cost line (see reports/institutional-strategy-feasibility-2026.md
 * §2.1.3). Returns null (not even attempted) when neither key is supplied -
 * output field byokEnrichment is null in that case, never a fabricated value.
 */
export declare function runByokEnrichment(domain: string | null, hunterApiKey?: string, peopleDataLabsApiKey?: string): Promise<ByokEnrichmentResult | null>;
//# sourceMappingURL=byok.d.ts.map