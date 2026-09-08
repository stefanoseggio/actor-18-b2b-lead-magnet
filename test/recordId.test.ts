import { describe, expect, it } from 'vitest';

import { computeRecordId } from '../src/recordId.js';

describe('computeRecordId', () => {
    it('uses osm:<nativeId> for OSM-discovered leads', () => {
        expect(computeRecordId('osm', 'node/48213456', 'Acme Corp', 'https://acme-corp.example')).toBe('osm:node/48213456');
    });

    it('falls back to a stable seed hash for OSM discovery with no nativeId', () => {
        const id = computeRecordId('osm', null, 'Acme Corp', 'https://acme-corp.example');
        expect(id).toMatch(/^seed:[0-9a-f]{16}$/);
    });

    it('produces a stable seed:<hash> for seed-list leads, same input -> same id', () => {
        const a = computeRecordId('seedList', null, 'Acme Corp', 'https://acme-corp.example');
        const b = computeRecordId('seedList', null, 'Acme Corp', 'https://acme-corp.example');
        expect(a).toBe(b);
        expect(a).toMatch(/^seed:[0-9a-f]{16}$/);
    });

    it('is case- and whitespace-insensitive on name/website (same business, differently typed)', () => {
        const a = computeRecordId('seedList', null, 'Acme Corp', 'https://acme-corp.example');
        const b = computeRecordId('seedList', null, '  ACME CORP  ', 'HTTPS://ACME-CORP.EXAMPLE');
        expect(a).toBe(b);
    });

    it('produces different ids for different businesses', () => {
        const a = computeRecordId('seedList', null, 'Acme Corp', 'https://acme-corp.example');
        const b = computeRecordId('seedList', null, 'Beta LLC', 'https://beta.example');
        expect(a).not.toBe(b);
    });

    it('produces different ids for the same name with a null vs. a real website', () => {
        const a = computeRecordId('seedList', null, 'Acme Corp', null);
        const b = computeRecordId('seedList', null, 'Acme Corp', 'https://acme-corp.example');
        expect(a).not.toBe(b);
    });
});
