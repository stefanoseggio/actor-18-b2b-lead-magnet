import { describe, expect, it } from 'vitest';

import { parseSeedList } from '../src/discovery/seedList.js';

describe('parseSeedList', () => {
    it('treats a bare company name as a name-only candidate (no website)', () => {
        const result = parseSeedList(['Acme Corp']);
        expect(result).toEqual([{ name: 'Acme Corp', website: null }]);
    });

    it('treats a bare domain as a domain candidate, deriving a name and normalizing the scheme', () => {
        const result = parseSeedList(['acme.com']);
        expect(result).toEqual([{ name: 'Acme', website: 'https://acme.com' }]);
    });

    it('leaves an already-schemed URL alone, deriving name from the host', () => {
        const result = parseSeedList(['https://acme.com/about']);
        expect(result).toEqual([{ name: 'Acme', website: 'https://acme.com/about' }]);
    });

    it('strips a leading www. when deriving the name', () => {
        const result = parseSeedList(['www.acme.com']);
        expect(result[0].name).toBe('Acme');
    });

    it('parses a mixed list of names and domains in one pass', () => {
        const result = parseSeedList(['Acme Corp', 'beta.io', 'Gamma LLC']);
        expect(result).toEqual([
            { name: 'Acme Corp', website: null },
            { name: 'Beta', website: 'https://beta.io' },
            { name: 'Gamma LLC', website: null },
        ]);
    });

    it('trims whitespace and skips blank entries', () => {
        const result = parseSeedList(['  Acme Corp  ', '', '   ', 'beta.io']);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Acme Corp');
    });

    it('de-duplicates on normalized website, case-insensitively', () => {
        const result = parseSeedList(['acme.com', 'ACME.COM', 'https://acme.com']);
        expect(result).toHaveLength(1);
    });

    it('de-duplicates name-only entries on lowercased name', () => {
        const result = parseSeedList(['Acme Corp', 'acme corp', 'ACME CORP']);
        expect(result).toHaveLength(1);
    });

    it('does not treat a multi-word entry with a dot as a domain (a name containing a period is not a URL)', () => {
        const result = parseSeedList(['Acme Corp. International']);
        expect(result).toEqual([{ name: 'Acme Corp. International', website: null }]);
    });

    it('returns an empty array for an empty or all-blank input', () => {
        expect(parseSeedList([])).toEqual([]);
        expect(parseSeedList(['', '  ', '\t'])).toEqual([]);
    });
});
