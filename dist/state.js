import { Actor } from 'apify';
// A NAMED key-value store (not Actor.getValue()/setValue(), which resolve to
// the store "associated with the current Actor run" per the Apify SDK docs -
// i.e. isolated per run, never shared across separate runs, the exact bug
// found and fixed on this fleet's primer-actor) persists lead identity
// across runs. This actor is a stateless, customer-triggered discovery+
// enrichment waterfall, not a registry poller - there is no listing
// lifecycle to classify (NEW_LISTING/STATUS_CHANGE/UPDATED/CLOSED doesn't
// apply to a business's own web presence the way it does to a government
// tender or gazette entry). What genuinely DOES apply, and is what this
// state exists for: avoiding re-running the full enrichment waterfall (and
// re-charging basic_lead/enriched_lead PPE) for the exact same business
// across repeat runs of the same seed list or bounding box.
const SEEN_LEADS_STORE_NAME = 'actor-18-b2b-lead-magnet-seen-leads';
const MAX_SEEN_LEADS = 20000;
export function createEmptyState() {
    return { seen: {} };
}
export async function loadState() {
    const store = await Actor.openKeyValueStore(SEEN_LEADS_STORE_NAME);
    const state = await store.getValue('state');
    return state && typeof state.seen === 'object' && state.seen !== null ? state : createEmptyState();
}
/** Persists every record_id actually processed this run (regardless of skipKnownLeads), merged with prior state and capped to the most recently-seen MAX_SEEN_LEADS entries. */
export async function saveState(state, newlySeenIds, runAt) {
    const merged = { ...state.seen };
    for (const id of newlySeenIds)
        merged[id] = runAt;
    let capped = merged;
    const keys = Object.keys(merged);
    if (keys.length > MAX_SEEN_LEADS) {
        const keptKeys = keys.sort((a, b) => merged[b].localeCompare(merged[a])).slice(0, MAX_SEEN_LEADS);
        capped = Object.fromEntries(keptKeys.map((k) => [k, merged[k]]));
    }
    const next = { seen: capped };
    const store = await Actor.openKeyValueStore(SEEN_LEADS_STORE_NAME);
    await store.setValue('state', next);
    return next;
}
//# sourceMappingURL=state.js.map