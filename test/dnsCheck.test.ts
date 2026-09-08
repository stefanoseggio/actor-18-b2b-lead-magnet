import { beforeEach, describe, expect, it, vi } from 'vitest';

// This suite mocks node:dns rather than hitting live resolvers, so it is
// documented here explicitly: src/enrichment/dnsCheck.ts's
// dns.promises.resolveMx() usage was manually verified against real network
// calls during development (google.com returned a real MX record set;
// example.com and a nonexistent domain both returned an empty/no-mail
// result) - see this actor's session notes. This test file instead exercises
// the function against controlled, deterministic MX record sets, so the
// suite passes identically in CI/any sandbox regardless of outbound network
// availability or a specific domain's real MX records changing over time.
const resolveMx = vi.fn();

vi.mock('node:dns', () => ({
    promises: {
        resolveMx: (...args: unknown[]) => resolveMx(...args),
    },
}));

const { checkEmailPlausibility } = await import('../src/enrichment/dnsCheck.js');

describe('checkEmailPlausibility', () => {
    beforeEach(() => {
        resolveMx.mockReset();
    });

    it('returns no_domain / null when no domain is supplied, without ever calling resolveMx', async () => {
        const result = await checkEmailPlausibility(null);
        expect(result).toEqual({ emailPlausible: null, emailPlausibilityMethod: 'no_domain', mxRecords: [] });
        expect(resolveMx).not.toHaveBeenCalled();
    });

    it('returns mx_record_present / true for a domain with a real MX record set', async () => {
        resolveMx.mockResolvedValueOnce([{ exchange: 'smtp.google.com', priority: 10 }]);
        const result = await checkEmailPlausibility('google.com');
        expect(result.emailPlausible).toBe(true);
        expect(result.emailPlausibilityMethod).toBe('mx_record_present');
        expect(result.mxRecords).toEqual(['smtp.google.com']);
        expect(resolveMx).toHaveBeenCalledWith('google.com');
    });

    it('returns null_mx / false for an RFC 7505 null-MX record (".")', async () => {
        resolveMx.mockResolvedValueOnce([{ exchange: '.', priority: 0 }]);
        const result = await checkEmailPlausibility('null-mx-example.test');
        expect(result.emailPlausible).toBe(false);
        expect(result.emailPlausibilityMethod).toBe('null_mx');
        expect(result.mxRecords).toEqual([]);
    });

    it('returns null_mx / false when the resolver reports no MX records at all (ENOTFOUND/ENODATA)', async () => {
        const error = Object.assign(new Error('queryMx ENOTFOUND no-mx-example.test'), { code: 'ENOTFOUND' });
        resolveMx.mockRejectedValueOnce(error);
        const result = await checkEmailPlausibility('no-mx-example.test');
        expect(result.emailPlausible).toBe(false);
        expect(result.emailPlausibilityMethod).toBe('null_mx');
    });

    it('returns mx_lookup_failed / null (unknown, never false) on a transient resolver error', async () => {
        const error = Object.assign(new Error('queryMx ETIMEOUT'), { code: 'ETIMEOUT' });
        resolveMx.mockRejectedValueOnce(error);
        const result = await checkEmailPlausibility('slow-resolver-example.test');
        expect(result.emailPlausible).toBeNull();
        expect(result.emailPlausibilityMethod).toBe('mx_lookup_failed');
    });

    it('filters out a null-MX record mixed in with a real one and treats the domain as plausible', async () => {
        resolveMx.mockResolvedValueOnce([
            { exchange: '.', priority: 0 },
            { exchange: 'mail.example.test', priority: 10 },
        ]);
        const result = await checkEmailPlausibility('mixed-example.test');
        expect(result.emailPlausible).toBe(true);
        expect(result.mxRecords).toEqual(['mail.example.test']);
    });
});
