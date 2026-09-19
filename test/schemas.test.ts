import { describe, expect, it } from 'vitest';

import { ActorInputSchema, MAX_LEADS_CAP } from '../src/schemas.js';

// This actor processes candidates.slice(0, maxLeads) strictly sequentially
// (one candidate's full enrichment waterfall - website crawl, DNS check,
// optional BYOK/intent-score calls - awaited before the next starts), so
// maxLeads is a direct multiplier on this run's real wall-clock time against
// a fixed 3600s defaultRunOptions.timeoutSecs. MAX_LEADS_CAP=500 is sized so
// even this actor's own worst case (every optional enrichment engaged,
// every fetchWithRetry call exhausting its retries) uses well under the
// real 3600s budget - see the fix commit for the full arithmetic against
// src/http.ts's real maxRetries/baseDelayMs constants.
describe('ActorInputSchema maxLeads timeout-budget cap', () => {
    it('exposes the real cap value used by the schema (not a re-typed literal)', () => {
        expect(MAX_LEADS_CAP).toBe(500);
    });

    it('accepts maxLeads exactly at the cap', () => {
        const result = ActorInputSchema.safeParse({ maxLeads: MAX_LEADS_CAP });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.maxLeads).toBe(500);
    });

    it('rejects maxLeads one above the cap', () => {
        const result = ActorInputSchema.safeParse({ maxLeads: MAX_LEADS_CAP + 1 });
        expect(result.success).toBe(false);
    });

    it('rejects the actor input schema\'s former 5000 maximum, now well over the cap', () => {
        const result = ActorInputSchema.safeParse({ maxLeads: 5000 });
        expect(result.success).toBe(false);
    });

    it('still rejects maxLeads below the 1 minimum', () => {
        const result = ActorInputSchema.safeParse({ maxLeads: 0 });
        expect(result.success).toBe(false);
    });

    it('still defaults to 50 (well under the cap) when maxLeads is omitted', () => {
        const result = ActorInputSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.maxLeads).toBe(50);
    });
});
