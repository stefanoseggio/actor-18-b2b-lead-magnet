export interface SeenLeadsState {
    /** record_id -> ISO timestamp first seen. A flat seen-set is correct here (not a richer per-actor fingerprint) - there is no "did this business's content change" signal this actor tracks; the only question is "have I already discovered and charged for this exact business." */
    seen: Record<string, string>;
}
export declare function createEmptyState(): SeenLeadsState;
export declare function loadState(): Promise<SeenLeadsState>;
/** Persists every record_id actually processed this run (regardless of skipKnownLeads), merged with prior state and capped to the most recently-seen MAX_SEEN_LEADS entries. */
export declare function saveState(state: SeenLeadsState, newlySeenIds: string[], runAt: string): Promise<SeenLeadsState>;
//# sourceMappingURL=state.d.ts.map