export type EmailPlausibilityMethod = 'mx_record_present' | 'null_mx' | 'mx_lookup_failed' | 'no_domain';
export interface DnsCheckResult {
    /** null only when no domain was available to check at all (unknown, not false). */
    emailPlausible: boolean | null;
    emailPlausibilityMethod: EmailPlausibilityMethod;
    mxRecords: string[];
}
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
export declare function checkEmailPlausibility(domain: string | null): Promise<DnsCheckResult>;
//# sourceMappingURL=dnsCheck.d.ts.map