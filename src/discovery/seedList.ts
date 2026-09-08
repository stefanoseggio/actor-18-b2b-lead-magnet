export interface SeedListCandidate {
    name: string;
    website: string | null;
}

const DOMAIN_OR_URL_PATTERN =
    /^(https?:\/\/)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:[/?#].*)?$/i;

function looksLikeDomainOrUrl(entry: string): boolean {
    return !entry.includes(' ') && DOMAIN_OR_URL_PATTERN.test(entry);
}

function normalizeWebsite(entry: string): string {
    return /^https?:\/\//i.test(entry) ? entry : `https://${entry}`;
}

function deriveNameFromDomain(entry: string): string {
    const withoutScheme = entry.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const host = withoutScheme.split(/[/?#]/)[0];
    const label = host.split('.')[0] ?? host;
    if (!label) return host;
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Mode A discovery: customer-supplied seed list. Zero discovery-layer risk -
 * this makes no external request at all, it only parses input the customer
 * already typed. Each entry may be a bare company name ("Acme Corp") or a
 * domain/URL ("acme.com", "https://acme.com/about") - the two are told apart
 * heuristically rather than via a second input field, so a customer can
 * paste one mixed list. De-duplicates on the normalized website (falling
 * back to the lowercased name) so the same business isn't enriched twice.
 */
export function parseSeedList(seeds: string[]): SeedListCandidate[] {
    const seen = new Set<string>();
    const candidates: SeedListCandidate[] = [];

    for (const rawEntry of seeds) {
        const entry = rawEntry.trim();
        if (!entry) continue;

        const isDomainOrUrl = looksLikeDomainOrUrl(entry);
        const website = isDomainOrUrl ? normalizeWebsite(entry) : null;
        const name = isDomainOrUrl ? deriveNameFromDomain(entry) : entry;

        const dedupeKey = (website ?? name).toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        candidates.push({ name, website });
    }

    return candidates;
}
