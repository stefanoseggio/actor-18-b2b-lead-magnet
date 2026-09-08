import { promises as dns } from 'node:dns';

export type EmailPlausibilityMethod = 'mx_record_present' | 'null_mx' | 'mx_lookup_failed' | 'no_domain';

export interface DnsCheckResult {
    /** null only when no domain was available to check at all (unknown, not false). */
    emailPlausible: boolean | null;
    emailPlausibilityMethod: EmailPlausibilityMethod;
    mxRecords: string[];
}

const NO_DOMAIN_RESULT: DnsCheckResult = { emailPlausible: null, emailPlausibilityMethod: 'no_domain', mxRecords: [] };

/**
 * Step 3 of the waterfall: the free, zero-ToS-risk email-plausibility
 * pre-filter. Queries the public DNS system (not the business's own
 * server) for the domain's MX record set via Node's real
 * dns.promises.resolveMx(). A non-empty set that isn't solely an RFC 7505
 * null-MX ('.') record means the domain has a genuinely configured
 * mail-receiving path -> emailPlausible: true. This confirms the domain is
 * *capable* of receiving mail, not that any specific address at it is real
 * or monitored - a plausibility signal, not proof of deliverability.
 */
export async function checkEmailPlausibility(domain: string | null): Promise<DnsCheckResult> {
    if (!domain) return NO_DOMAIN_RESULT;

    try {
        const records = await dns.resolveMx(domain);
        const realRecords = records.filter((record) => record.exchange !== '.' && record.exchange !== '');

        if (realRecords.length === 0) {
            return { emailPlausible: false, emailPlausibilityMethod: 'null_mx', mxRecords: [] };
        }
        return {
            emailPlausible: true,
            emailPlausibilityMethod: 'mx_record_present',
            mxRecords: realRecords.map((record) => record.exchange),
        };
    } catch (error) {
        const { code } = error as NodeJS.ErrnoException;
        if (code === 'ENOTFOUND' || code === 'ENODATA') {
            // The resolver found the domain but no MX record set at all -
            // functionally equivalent to a null MX for this actor's purposes.
            return { emailPlausible: false, emailPlausibilityMethod: 'null_mx', mxRecords: [] };
        }
        // A transient/network resolver error (e.g. ETIMEOUT, SERVFAIL) is
        // genuinely unknown, not a confirmed "no mail" - never reported as false.
        return { emailPlausible: null, emailPlausibilityMethod: 'mx_lookup_failed', mxRecords: [] };
    }
}
