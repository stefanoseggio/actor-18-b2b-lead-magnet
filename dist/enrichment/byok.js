import { fetchWithRetry } from '../http.js';
const HUNTER_DOMAIN_SEARCH_URL = 'https://api.hunter.io/v2/domain-search';
const PDL_COMPANY_ENRICH_URL = 'https://api.peopledatalabs.com/v5/company/enrich';
async function callHunterIo(domain, apiKey) {
    if (!domain)
        return { used: false, data: null, error: 'No domain available for lookup.' };
    try {
        const url = `${HUNTER_DOMAIN_SEARCH_URL}?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(apiKey)}`;
        const response = await fetchWithRetry(url, { maxRetries: 1 });
        const json = (await response.json());
        if (!response.ok) {
            return { used: true, data: null, error: `Hunter.io HTTP ${response.status}` };
        }
        return { used: true, data: json, error: null };
    }
    catch (error) {
        return { used: true, data: null, error: error instanceof Error ? error.message : String(error) };
    }
}
async function callPeopleDataLabs(domain, apiKey) {
    if (!domain)
        return { used: false, data: null, error: 'No domain available for lookup.' };
    try {
        const url = `${PDL_COMPANY_ENRICH_URL}?website=${encodeURIComponent(domain)}`;
        const response = await fetchWithRetry(url, { maxRetries: 1, headers: { 'X-Api-Key': apiKey } });
        const json = (await response.json());
        if (!response.ok) {
            return { used: true, data: null, error: `People Data Labs HTTP ${response.status}` };
        }
        return { used: true, data: json, error: null };
    }
    catch (error) {
        return { used: true, data: null, error: error instanceof Error ? error.message : String(error) };
    }
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
export async function runByokEnrichment(domain, hunterApiKey, peopleDataLabsApiKey) {
    if (!hunterApiKey && !peopleDataLabsApiKey)
        return null;
    const result = { hunterIo: null, peopleDataLabs: null };
    if (hunterApiKey) {
        result.hunterIo = await callHunterIo(domain, hunterApiKey);
    }
    if (peopleDataLabsApiKey) {
        result.peopleDataLabs = await callPeopleDataLabs(domain, peopleDataLabsApiKey);
    }
    return result;
}
//# sourceMappingURL=byok.js.map