export interface IntentScoreResult {
    intentScore: number | null;
    intentScoreRationale: string | null;
    /** Always populated whenever scoring was attempted - never omitted, per this actor's binding honest-labeling requirement. */
    intentScoreDisclaimer: string;
}
export declare const INTENT_SCORE_DISCLAIMER = "Heuristic LLM-derived estimate from public website text only. Not a verified fact; not checked against any funding database, ATS, or independent tech-stack scan.";
/**
 * Step 5 of the waterfall (optional, gated by the includeIntentScore input):
 * one Claude Haiku 4.5 call per business scoring hiring/funding/tech-stack
 * signals from text already crawled in Step 2 - no new outbound request to
 * the business itself. This is the actor operator's OWN compute cost (not
 * BYOK), priced into the enriched_lead PPE rate, so `apiKey` here is this
 * Actor's own ANTHROPIC_API_KEY environment variable, not a customer input.
 * Degrades gracefully (null score, explanatory rationale, disclaimer still
 * populated) rather than throwing - a missing key or a model-call failure
 * should never crash the whole enrichment record.
 */
export declare function computeIntentScore(crawledText: string, apiKey: string | undefined): Promise<IntentScoreResult>;
//# sourceMappingURL=intentScore.d.ts.map