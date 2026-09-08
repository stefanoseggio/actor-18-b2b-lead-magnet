# Universal B2B Lead Magnet & Intent Enricher

A compliant B2B lead discovery and enrichment pipeline: point it at a list of company names/domains, or a geographic bounding box, and get back structured leads with contact-plausibility checks and optional AI-scored buying intent - without touching Google Maps data, which its own Terms of Service forbid using this way.

## Why use this Actor?

- **ToS-safe discovery.** Google's Maps/Earth Additional Terms and Maps Platform Terms both explicitly prohibit building a "business listings database" from Maps content - a near-exact description of what a lead-gen tool needs. This Actor discovers via OpenStreetMap's ODbL-licensed Overpass API instead (which explicitly permits bulk extraction) or your own supplied list - never Google Maps.
- **Real signal, not guesswork.** Every lead gets a live DNS/MX check on its domain (a real, deliberately-configured mail-receiving path, not a guessed email), and an optional Claude-scored buying-intent signal read only from the business's own public site text.
- **BYOK for third-party enrichment.** Bring your own Hunter.io or People Data Labs key and that provider bills *you* directly - this Actor's own price never includes a markup on services you already pay for.
- **Skip what you already have.** Enable `skipKnownLeads` on a recurring run and already-processed leads are skipped entirely - no re-crawl, no re-charge.

## How to use it

1. Choose a discovery mode: `seedList` (paste company names or domains you already have) or `osmOverpass` (discover businesses within a bounding box).
2. Optionally supply your own Hunter.io / People Data Labs key for deeper contact enrichment, and/or enable `includeIntentScore` for an AI-scored buying-intent signal.
3. Run it. Each lead becomes one dataset row with contact info, plausibility checks, and (if enabled) an intent score with its own transparency disclaimer.

```json
{
  "discoveryMode": "seedList",
  "seedList": ["acme.com", "Beta Consulting LLC", "https://gamma-industries.example"],
  "includeIntentScore": true
}
```

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `discoveryMode` | string | `seedList` | `seedList` (enrich names/domains you supply) or `osmOverpass` (discover within a bounding box). |
| `seedList` | array | `[]` | Company names or domains/URLs, mixed freely - required for `seedList` mode. |
| `overpassBbox` | string | - | `"south,west,north,east"` in decimal degrees - required for `osmOverpass` mode. |
| `maxLeads` | integer | `50` | Hard cap on leads enriched (and charged) this run. |
| `includeIntentScore` | boolean | `false` | Adds a Claude-scored buying-intent signal per lead (bills the higher `enriched_lead` tier). |
| `hunterApiKey` / `peopleDataLabsApiKey` | string | - | Your own BYOK keys - that provider bills you directly, not this Actor. |
| `skipKnownLeads` | boolean | `false` | Skip (and don't re-charge for) a lead already processed in a prior run - see "Delta mode" below. |

## Output

```json
{
  "record_id": "seed:3f9a1c2b8e7d4f0a",
  "event_type": "NEW_LISTING",
  "scraped_at": "2026-09-08T14:00:00.000Z",
  "is_new": true,
  "source_url": "https://acme.com",
  "recipient_or_defendant_name": "Acme",
  "jurisdiction": "GLOBAL",
  "discoverySource": "seedList",
  "website": "https://acme.com",
  "emailsFound": ["contact@acme.com"],
  "emailPlausible": true,
  "emailPlausibilityMethod": "mx_record_present",
  "websiteContentUnavailable": false,
  "byokEnrichment": null,
  "intentScore": 62,
  "intentScoreRationale": "Careers page lists 3 open roles; HubSpot tag present on homepage.",
  "intentScoreDisclaimer": "Heuristic LLM-derived estimate from public website text only. Not a verified fact."
}
```

You can download the dataset in various formats such as JSON, HTML, CSV, or Excel.

## Delta mode - skip already-known leads

Enable `skipKnownLeads: true` on a recurring run against the same seed list or bounding box, and a lead already discovered in a prior run is skipped **before** the enrichment waterfall runs - no repeat website crawl, no repeat BYOK/intent-score calls, and no repeat charge. `is_new` on every record tells you whether this is the first time that exact business has been seen, regardless of whether you've turned skipping on.

There's no "changed" or "closed" event here: unlike a government registry, a business's own web presence has no observable status this Actor tracks - just new-or-already-known.

## Pricing - two tiers, never blended

| Event | What it covers | Price |
|---|---|---|
| `basic_lead` | Discovery + website crawl + DNS/MX check | **$0.002/record** |
| `enriched_lead` | Everything in `basic_lead` plus the Claude intent score | **$0.015/record** |

The LLM step costs roughly 7x the rest of the waterfall combined - kept as a separate tier so a basic run never silently absorbs that cost.

## Compliance

No CAPTCHA-solving, no fingerprint spoofing, no WAF/OAuth-gate bypass anywhere in this Actor. Google Maps is excluded from discovery entirely (see "Why use this Actor?" above) - OpenStreetMap's Overpass API is used instead, under a license that explicitly permits this use. Every outbound call either hits a genuinely open API/license or is explicitly customer-authorized (your own BYOK key).

## Known limitations

- A record only proceeds past OSM discovery if it carries a `website`/`contact:*` tag - a real, honest coverage gap versus a source like Google's business listings, disclosed rather than hidden.
- A JS-rendered single-page site degrades to `websiteContentUnavailable: true` rather than escalating to a headless browser (kept out of this Actor's compliance posture on purpose).
- `intentScore` is a heuristic LLM read of public page text only - never a verified fact, always paired with its own disclaimer field.

Questions or a source-coverage request? Use the Issues tab - custom extensions are available.
