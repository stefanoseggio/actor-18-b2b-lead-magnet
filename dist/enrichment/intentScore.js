import { fetchWithRetry } from '../http.js';
export const INTENT_SCORE_DISCLAIMER = 'Heuristic LLM-derived estimate from public website text only. Not a verified fact; not checked against any funding database, ATS, or independent tech-stack scan.';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Real, currently published Anthropic model id and pricing ($1.00/MTok in,
// $5.00/MTok out) per reports/institutional-strategy-feasibility-2026.md
// §2.1.4 - a short, bounded classification/scoring task, not open-ended
// reasoning, so Haiku (not a larger model) is the appropriate choice.
const MODEL = 'claude-haiku-4-5';
const MAX_INPUT_CHARS = 4000;
function buildPrompt(crawledText) {
    return [
        'You are scoring one business\'s buying intent from its own public website text only (homepage plus, when available, a contact/about/careers page).',
        'Look for three signal categories: (1) hiring-page presence and whether it lists specific open roles vs. a generic placeholder; (2) funding-news language ("raised $X", "Series A/B", "backed by"), read only from this text, never cross-checked externally; (3) tech-stack signals such as visible third-party script/widget names in the text.',
        'Respond with strict JSON only, no prose outside the JSON object, in exactly this shape: {"score": <integer 0-100>, "rationale": "<one short sentence citing what you found>"}.',
        '',
        'WEBSITE TEXT:',
        crawledText,
    ].join('\n');
}
function parseModelOutput(text) {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match)
            return { score: null, rationale: 'Could not parse a JSON object from the model response.' };
        const parsed = JSON.parse(match[0]);
        const score = typeof parsed.score === 'number' && Number.isFinite(parsed.score)
            ? Math.max(0, Math.min(100, Math.round(parsed.score)))
            : null;
        const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : null;
        return { score, rationale };
    }
    catch {
        return { score: null, rationale: 'Could not parse a JSON object from the model response.' };
    }
}
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
export async function computeIntentScore(crawledText, apiKey) {
    if (!apiKey) {
        return {
            intentScore: null,
            intentScoreRationale: 'Intent scoring skipped: this Actor\'s ANTHROPIC_API_KEY environment variable is not configured.',
            intentScoreDisclaimer: INTENT_SCORE_DISCLAIMER,
        };
    }
    const truncated = crawledText.slice(0, MAX_INPUT_CHARS);
    if (!truncated.trim()) {
        return {
            intentScore: null,
            intentScoreRationale: 'Intent scoring skipped: no crawled website text was available for this business.',
            intentScoreDisclaimer: INTENT_SCORE_DISCLAIMER,
        };
    }
    try {
        const response = await fetchWithRetry(ANTHROPIC_MESSAGES_URL, {
            method: 'POST',
            maxRetries: 1,
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 300,
                messages: [{ role: 'user', content: buildPrompt(truncated) }],
            }),
        });
        if (!response.ok) {
            return {
                intentScore: null,
                intentScoreRationale: `Intent scoring failed: Anthropic API returned HTTP ${response.status}.`,
                intentScoreDisclaimer: INTENT_SCORE_DISCLAIMER,
            };
        }
        const json = (await response.json());
        const text = json.content?.find((block) => block.type === 'text')?.text ?? '';
        const parsed = parseModelOutput(text);
        return {
            intentScore: parsed.score,
            intentScoreRationale: parsed.rationale,
            intentScoreDisclaimer: INTENT_SCORE_DISCLAIMER,
        };
    }
    catch (error) {
        return {
            intentScore: null,
            intentScoreRationale: `Intent scoring failed: ${error instanceof Error ? error.message : String(error)}`,
            intentScoreDisclaimer: INTENT_SCORE_DISCLAIMER,
        };
    }
}
//# sourceMappingURL=intentScore.js.map