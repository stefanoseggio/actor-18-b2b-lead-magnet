import { Actor } from 'apify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createEmptyState, loadState, saveState } from '../src/state.js';

describe('seen-leads state persistence', () => {
    beforeAll(async () => {
        await Actor.init();
    });

    afterAll(async () => {
        await Actor.exit({ exit: false });
    });

    it('returns an empty state when nothing has been saved yet', async () => {
        const state = await loadState();
        expect(state.seen).toEqual({});
    });

    it('round-trips newly-seen record ids', async () => {
        const state = await saveState(createEmptyState(), ['seed:aaaa', 'osm:node/1'], '2026-09-08T00:00:00.000Z');
        expect(state.seen['seed:aaaa']).toBe('2026-09-08T00:00:00.000Z');
        expect(state.seen['osm:node/1']).toBe('2026-09-08T00:00:00.000Z');

        const loaded = await loadState();
        expect(loaded.seen['seed:aaaa']).toBe('2026-09-08T00:00:00.000Z');
    });

    it('merges new ids with prior state without dropping existing entries', async () => {
        const state = await saveState(await loadState(), ['seed:bbbb'], '2026-09-08T01:00:00.000Z');
        expect(state.seen['seed:aaaa']).toBeDefined();
        expect(state.seen['seed:bbbb']).toBe('2026-09-08T01:00:00.000Z');
    });

    it('treats a malformed value as absent rather than throwing', async () => {
        const store = await Actor.openKeyValueStore('actor-18-b2b-lead-magnet-seen-leads');
        await store.setValue('state', { notTheRightShape: true });
        const loaded = await loadState();
        expect(loaded).toEqual(createEmptyState());
    });
});
