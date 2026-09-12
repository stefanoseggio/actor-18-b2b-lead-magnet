# B2B Lead Enrichment Engine - Contact Discovery & Buying-Intent Scoring (Global)

## Executive Value Proposition

Hand-prospecting a single company means opening its website, hunting down a contact page, eyeballing whether an email looks real, and reading the site for hiring or funding signals before deciding whether it's worth a rep's time - several minutes of manual work per lead, every time. This Actor runs that same sequence automatically - website crawl, DNS/MX plausibility check on every email found, and an optional AI-scored buying-intent read of the business's own public text - across up to 5,000 leads in one run, from either a seed list you already have or a compliant OpenStreetMap-based discovery pass. Enable `skipKnownLeads` on a recurring run and a business already discovered in a prior run is skipped entirely - no repeat crawl, no repeat enrichment call, no repeat charge - so ongoing account monitoring only ever pays for genuinely new leads.

## Enterprise Use Cases

- **Recurring account-based prospecting without repeat spend.** Point the Actor at the same seed list of target accounts on a weekly or monthly schedule with `skipKnownLeads: true`. Every business already discovered and charged for in a prior run is skipped before the enrichment waterfall runs, so a standing account list only incurs cost for names that are genuinely new to the run history - not a full re-crawl every cycle.
- **Compliant territory expansion via geographic discovery.** Sales-ops teams entering a new region can discover candidate businesses inside a bounding box using OpenStreetMap's Overpass API (`osmOverpass` mode) instead of scraping Google Maps, which its own Additional Terms and Maps Platform Terms explicitly prohibit using to build a business-listings database. Every discovered lead still gets the same site-crawl, DNS/MX, and optional enrichment treatment as a seed-list lead.
- **Intent-prioritized SDR handoff.** Run a large candidate list with `includeIntentScore: true` and each lead comes back with a 0-100 buying-intent score and rationale read from Claude Haiku 4.5's analysis of that business's own crawled page text (careers pages, tech-stack hints, etc.), each paired with a mandatory disclaimer that it is a heuristic read, not a verified fact. Sales leadership can triage a long list down to the highest-scored subset before handing it to reps, instead of working the list in raw discovery order.

## Input

```json
{
  "discoveryMode": "seedList",
  "seedList": ["acme.com", "Beta Consulting LLC", "https://gamma-industries.example"],
  "maxLeads": 50,
  "includeIntentScore": true,
  "skipKnownLeads": true
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `discoveryMode` | string | `seedList` | `seedList` (enrich names/domains you supply directly) or `osmOverpass` (discover candidate businesses from OpenStreetMap's Overpass API within a bounding box). |
| `seedList` | array | `[]` | Company names or website domains/URLs to enrich, mixed freely. Required (non-empty) when `discoveryMode` is `seedList`. |
| `overpassBbox` | string | - | `"south,west,north,east"` in decimal degrees, e.g. `"50.70,-1.90,50.90,-1.30"`. Required when `discoveryMode` is `osmOverpass`. |
| `maxLeads` | integer | `50` | Hard cap on how many candidates are enriched and charged this run (1-5000). |
| `includeIntentScore` | boolean | `false` | Adds one Claude Haiku 4.5 buying-intent call per lead, read only from that business's own crawled site text. Bills the `enriched_lead` tier instead of `basic_lead`. |
| `hunterApiKey` | string | - | Your own Hunter.io API key (BYOK). Hunter.io bills your account directly, never this Actor's own price. |
| `peopleDataLabsApiKey` | string | - | Your own People Data Labs API key (BYOK), billed the same way as `hunterApiKey`. |
| `skipKnownLeads` | boolean | `false` | When enabled, a lead already discovered (and charged for) in a prior run is skipped before the enrichment waterfall runs - no repeat crawl, no repeat BYOK/intent-score call, no repeat charge. |

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

`record_id` is `osm:<type>/<id>` for OSM-discovered leads or a deterministic `seed:<hash>` for seed-list leads, stable across runs for the same input. `is_new` reflects whether this exact business (by OSM id, or normalized name+domain for seed-list leads) was ever seen in a prior run of this Actor - tracked regardless of whether `skipKnownLeads` is on. The dataset can be downloaded as JSON, HTML, CSV, or Excel.

## Reliability

Every outbound call - OSM Overpass, the discovered business's own website, and (when configured) Hunter.io, People Data Labs, or the Anthropic API - goes through a shared `fetchWithRetry` helper with exponential-backoff retry (each retry's delay doubles from a 500ms base), triggered on network errors, HTTP 429, and any 5xx response; individual call sites configure 1-2 retries for their specific external host. A 4xx response other than 429 (e.g. a 404 or a BYOK vendor's 401) is returned as-is rather than retried, so callers can inspect and handle it directly. If a business's site can't be fetched, is disallowed by robots.txt, or looks like a client-rendered SPA with no server-delivered content, the record is marked `websiteContentUnavailable: true` rather than escalating to a headless browser - a disclosed coverage gap, not a silent failure. Cross-run lead identity (`skipKnownLeads` and the `is_new` field) is persisted in a named Apify key-value store, capped at the 20,000 most-recently-seen leads, so it survives independently of any single run.

## Pricing

This Actor uses pay-per-event pricing with two tiers, never blended:

| Event | What it covers | Price |
|---|---|---|
| `basic_lead` | Discovery + website crawl + DNS/MX check | $0.002/record |
| `enriched_lead` | Everything in `basic_lead` plus the Claude buying-intent score | $0.015/record |

A BYOK Hunter.io or People Data Labs key is billed by that provider directly to your own account - never marked up or folded into either tier above.

## Support & Enterprise SLA

This Actor is built and maintained by an independent developer, not a staffed vendor team - there is no dedicated support desk or contractual uptime SLA on offer. Questions, bugs, or source-coverage requests are handled through the Apify Store's Issues tab and are typically addressed within 48 hours.
