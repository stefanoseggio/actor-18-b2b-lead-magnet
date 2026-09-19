import { describe, expect, it, vi } from 'vitest';

import { buildOverpassQuery, discoverViaOverpass } from '../src/discovery/overpass.js';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
        ok,
        status,
        json: async () => body,
    } as Response;
}

describe('buildOverpassQuery', () => {
    it('substitutes the bbox and has no difference clause when no ids are excluded', () => {
        const query = buildOverpassQuery('1,2,3,4');
        expect(query).toContain('(1,2,3,4)');
        expect(query).not.toContain('-');
        expect(query).toContain('out center;');
    });

    it('adds a server-side difference clause grouped by OSM element type when ids are excluded', () => {
        const query = buildOverpassQuery('1,2,3,4', ['node/10', 'node/11', 'way/20']);
        expect(query).toContain('node(id:10,11);');
        expect(query).toContain('way(id:20);');
        expect(query).toMatch(/\(\s*\(\s*[\s\S]*\)\s*;\s*-\s*\(\s*[\s\S]*\)\s*;\s*\)/);
    });

    it('ignores malformed exclude entries (no "type/id" shape) rather than throwing', () => {
        expect(() => buildOverpassQuery('1,2,3,4', ['not-a-valid-id', ''])).not.toThrow();
        const query = buildOverpassQuery('1,2,3,4', ['not-a-valid-id']);
        // No valid type/id pairs survive, so no exclude clause should be emitted.
        expect(query).not.toContain('(id:');
    });
});

describe('discoverViaOverpass', () => {
    it('forwards excludeOsmIds into the request body so already-seen elements are filtered server-side', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ elements: [] }));
        vi.stubGlobal('fetch', fetchMock);

        await discoverViaOverpass('1,2,3,4', 50, ['node/10']);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(requestInit.body).toContain('node(id:10);');

        vi.unstubAllGlobals();
    });

    it('keeps only elements with a name and a website/contact:* tag, capped at limit', async () => {
        const elements = [
            { type: 'node', id: 1, tags: { name: 'No website', shop: 'yes' } },
            { type: 'node', id: 2, tags: { name: 'Has website', website: 'https://a.example' } },
            { type: 'way', id: 3, tags: { name: 'Has contact', 'contact:website': 'https://b.example' } },
            { type: 'node', id: 4, tags: { name: 'Third one', website: 'https://c.example' } },
        ];
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ elements })));

        const candidates = await discoverViaOverpass('1,2,3,4', 2);

        expect(candidates).toHaveLength(2);
        expect(candidates[0]).toEqual({ osmId: 'node/2', name: 'Has website', website: 'https://a.example', tags: elements[1].tags });
        expect(candidates[1].osmId).toBe('way/3');

        vi.unstubAllGlobals();
    });

    it('throws when the Overpass API responds with a non-ok HTTP status', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 504)));
        await expect(discoverViaOverpass('1,2,3,4', 10)).rejects.toThrow('HTTP 504');
        vi.unstubAllGlobals();
    });
});
