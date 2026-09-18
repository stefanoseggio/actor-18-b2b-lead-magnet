# B2B Lead Enrichment Engine - Contact Discovery & Buying-Intent Scoring (Global)

[![Run on Apify](https://apify.com/ext/run-on-apify.png)](https://apify.com/stefano_seggio/actor-18-b2b-lead-magnet)

[![Built for Apify](https://img.shields.io/badge/Built%20for-Apify-1a1a2e?logo=apify&logoColor=white)](https://apify.com)
[![Pay-Per-Event pricing](https://img.shields.io/badge/Pay--Per--Event-from%20%240.002%2Frecord-brightgreen)](#cost--byok-disclosure)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Apache 2.0 License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

> This Actor discovers and enriches B2B leads worldwide (Global — no single jurisdiction) from either your own seed list or a compliant OpenStreetMap Overpass discovery pass, and runs whenever **you** trigger it or schedule it on your own Apify Scheduler — there is no fixed operator-side cadence.

## Executive Value Proposition

Hand-prospecting a single company means opening its website, hunting down a contact page, eyeballing whether an email looks real, and reading the site for hiring or funding signals before deciding whether it's worth a rep's time - several minutes of manual work per lead, every time. This Actor runs that same sequence automatically - website crawl, DNS/MX plausibility check on every email found, and an optional AI-scored buying-intent read of the business's own public text - across up to 5,000 leads in one run, from either a seed list you already have or a compliant OpenStreetMap-based discovery pass. Enable `skipKnownLeads` on a recurring run and a business already discovered in a prior run is skipped entirely - no repeat crawl, no repeat enrichment call, no repeat charge - so ongoing account monitoring only ever pays for genuinely new leads.

## Enterprise Use Cases

- **Recurring account-based prospecting without repeat spend.** Point the Actor at the same seed list of target accounts on a weekly or monthly schedule with `skipKnownLeads: true`. Every business already discovered and charged for in a prior run is skipped before the enrichment waterfall runs, so a standing account list only incurs cost for names that are genuinely new to the run history - not a full re-crawl every cycle.
- **Compliant territory expansion via geographic discovery.** Sales-ops teams entering a new region can discover candidate businesses inside a bounding box using OpenStreetMap's Overpass API (`osmOverpass` mode) instead of scraping Google Maps, which its own Additional Terms and Maps Platform Terms explicitly prohibit using to build a business-listings database. Every discovered lead still gets the same site-crawl, DNS/MX, and optional enrichment treatment as a seed-list lead.
- **Intent-prioritized SDR handoff.** Run a large candidate list with `includeIntentScore: true` and each lead comes back with a 0-100 buying-intent score and rationale read from Claude Haiku 4.5's analysis of that business's own crawled page text (careers pages, tech-stack hints, etc.), each paired with a mandatory disclaimer that it is a heuristic read, not a verified fact. Sales leadership can triage a long list down to the highest-scored subset before handing it to reps, instead of working the list in raw discovery order.

## Cost & BYOK Disclosure

### Pricing (Pay-Per-Event)

This Actor uses pay-per-event pricing with two tiers, never blended:

| Event | Title | What it covers | Price |
|---|---|---|---|
| `basic_lead` | Basic Lead | Discovery + website crawl + DNS/MX check | $0.002 / record |
| `enriched_lead` | Enriched Lead + Intent Score | Everything in `basic_lead` plus the Claude buying-intent score | $0.015 / record |

The billing tier is controlled solely by the `includeIntentScore` input flag: `true` charges every pushed record at `enriched_lead`, `false` (default) charges `basic_lead`. There is no third, blended, or hidden tier.

### No delta-engine fingerprint suppression on this Actor

Several other Delta Registry Actors monitor a registry over time and suppress an unchanged record's SHA-256 fingerprint before billing. This Actor is not one of them: it has no cross-run "unchanged record" concept, and `event_type` in its output is always `NEW_LISTING` because every enrichment is a fresh crawl of a business you asked for this run. What this Actor does instead to avoid double-billing a standing list: enable `skipKnownLeads` and a business already discovered (and billed) in a prior run — identified by a stable id (its OSM id, or a normalized name+domain hash for seed-list entries) — is skipped entirely before the enrichment waterfall runs, so there is no repeat crawl, no repeat BYOK/intent-score call, and no repeat `basic_lead`/`enriched_lead` charge for that same business. This is a seen/not-seen dedup keyed on identity, not a content-diff.

### BYOK (Bring Your Own Key) — optional

Optional Hunter.io / People Data Labs key unlocks the enriched_lead tier — basic_lead needs no key.

To be precise about the mechanics: supplying `hunterApiKey` and/or `peopleDataLabsApiKey` runs that vendor's own domain-search enrichment using **your** key, and that vendor bills **your own account** directly — never marked up, pooled, or folded into either PPE tier above. The `basic_lead`/`enriched_lead` PPE tier itself is a separate switch controlled by `includeIntentScore` (see above), not by whether a BYOK key was supplied. If neither key is supplied, `byokEnrichment` in the output is simply `null` and nothing outside this Actor's own PPE price is billed.

## Quickstart

Requires an [Apify API token](https://console.apify.com/settings/integrations). The Actor's real slug is `stefano_seggio/actor-18-b2b-lead-magnet` (Actor ID `5QufcYxRkFNHM4h8K`, works interchangeably in all three clients below).

### cURL (instant, synchronous)

Runs synchronously and returns the resulting dataset items directly in the response - no polling needed.

```bash
curl -X POST "https://api.apify.com/v2/acts/5QufcYxRkFNHM4h8K/run-sync-get-dataset-items?token=<YOUR_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
  "discoveryMode": "seedList",
  "seedList": [
    "apify.com"
  ],
  "maxLeads": 10,
  "includeIntentScore": false
}'
```

### Python (`apify-client`)

```python
import os
from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run_input = {
    "discoveryMode": "seedList",
    "seedList": ["acme.com", "Beta Consulting LLC", "https://gamma-industries.example"],
    "maxLeads": 25,
    "includeIntentScore": True,
    "skipKnownLeads": True,
}

run = client.actor("stefano_seggio/actor-18-b2b-lead-magnet").call(run_input=run_input)
items = client.dataset(run["defaultDatasetId"]).list_items().items
print(f"Fetched {len(items)} leads")
```

A full runnable copy lives at [`examples/run_actor.py`](./examples/run_actor.py).

### Node.js (`apify-client`)

```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

const run = await client.actor('stefano_seggio/actor-18-b2b-lead-magnet').call({
    discoveryMode: 'seedList',
    seedList: ['acme.com', 'Beta Consulting LLC', 'https://gamma-industries.example'],
    maxLeads: 25,
    includeIntentScore: true,
    skipKnownLeads: true,
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Fetched ${items.length} leads`);
```

A full runnable copy (CommonJS) lives at [`examples/run-actor.js`](./examples/run-actor.js).

### Apify CLI

```bash
apify call actor-18-b2b-lead-magnet --input '{
  "discoveryMode": "seedList",
  "seedList": ["acme.com", "Beta Consulting LLC", "https://gamma-industries.example"],
  "maxLeads": 25,
  "includeIntentScore": true,
  "skipKnownLeads": true
}'
```

## Use this from Claude Desktop, Cursor, or Windsurf (via MCP)

This Actor is also reachable through Apify's own hosted `@apify/actors-mcp-server` at `https://mcp.apify.com`, scoped to just this one Actor via a `?tools=stefano_seggio/actor-18-b2b-lead-magnet` query string - your MCP client gets tool access to this Actor alone, not the rest of the fleet. Get your own token from [Apify Console → Settings → Integrations](https://console.apify.com/settings/integrations) first.

**Claude Desktop** (`claude_desktop_config.json`) - uses the `mcp-remote` stdio bridge, not a direct URL. Note: `mcp-remote` does not expand shell environment variables inside this JSON string, so paste your real token literally in place of `${APIFY_TOKEN}` below, and keep this file out of version control:

```json
{
  "mcpServers": {
    "delta-registry-actor-18-b2b-lead-magnet": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.apify.com/?tools=stefano_seggio/actor-18-b2b-lead-magnet",
        "--header",
        "Authorization: Bearer ${APIFY_TOKEN}"
      ]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` or `~/.cursor/mcp.json`) - native HTTP transport:

```json
{
  "mcpServers": {
    "delta-registry-actor-18-b2b-lead-magnet": {
      "url": "https://mcp.apify.com/?tools=stefano_seggio/actor-18-b2b-lead-magnet",
      "headers": {
        "Authorization": "Bearer ${APIFY_TOKEN}"
      }
    }
  }
}
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`) - uses `serverUrl`, not `url`. Unlike Claude Desktop's `mcp-remote` bridge, Windsurf's `${env:...}` syntax genuinely resolves from your environment at runtime:

```json
{
  "mcpServers": {
    "delta-registry-actor-18-b2b-lead-magnet": {
      "serverUrl": "https://mcp.apify.com/?tools=stefano_seggio/actor-18-b2b-lead-magnet",
      "headers": {
        "Authorization": "Bearer ${env:APIFY_TOKEN}"
      }
    }
  }
}
```

Want every actor in the fleet available to one MCP client instead of just this one? See [`delta-registry-website/MCP_INTEGRATION.md`](https://github.com/stefanoseggio/delta-registry-website/blob/main/MCP_INTEGRATION.md) for the full 28-actor closed-scope config.

## Input & Output Schema

### Input

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

Full machine-readable definition: [`.actor/input_schema.json`](./.actor/input_schema.json).

### Sample Extracted Dataset (JSON)

One real record from this Actor's own dataset, matching [`.actor/dataset_schema.json`](./.actor/dataset_schema.json):

```json
{
  "record_id": "seed:3f9a1c2b8e7d4f0a",
  "event_type": "NEW_LISTING",
  "scraped_at": "2026-09-08T14:00:00.000Z",
  "is_new": true,
  "source_url": "https://acme.com",
  "website": "https://acme.com",
  "emailsFound": [
    "contact@acme.com"
  ],
  "emailPlausible": true,
  "emailPlausibilityMethod": "mx_record_present",
  "intentScore": 62,
  "intentScoreRationale": "Careers page lists 3 open roles; HubSpot tag present on homepage."
}
```

### Output field reference

| Field | Type | Description |
|---|---|---|
| `record_id` | string | `osm:<type>/<id>` for OSM-discovered leads or a deterministic `seed:<hash>` for seed-list leads, stable across runs for the same input. |
| `event_type` | string | Always `NEW_LISTING` - this Actor has no cross-run delta-tracking concept (see Cost & BYOK Disclosure above). |
| `scraped_at` | string | ISO-8601 timestamp of this enrichment. |
| `is_new` | boolean \| null | `true` if this exact business (by OSM id, or normalized name+domain for seed-list leads) was never seen in a prior run of this Actor; tracked regardless of whether `skipKnownLeads` is on. |
| `source_url` | string \| null | The business's own website, when known. |
| `discoverySource` | string | `seedList` or `osm` - which discovery path (Mode A or Mode B) produced this lead. |
| `website` | string \| null | Same as `source_url`; included for convenience in the overview view. |
| `emailsFound` | string[] | `mailto:` links and regex-matched addresses found on the crawled page(s). |
| `emailPlausible` | boolean \| null | `true` when the domain has a non-null MX record (`dns.promises.resolveMx`); `null` when no domain was available to check. |
| `emailPlausibilityMethod` | string \| null | One of `mx_record_present`, `null_mx`, `mx_lookup_failed`, `no_domain`, or `null`. |
| `intentScore` | number \| null | 0-100 heuristic buying-intent score from Claude Haiku 4.5, only when `includeIntentScore` was enabled and the model call succeeded. |
| `intentScoreRationale` | string \| null | Short natural-language justification for the score, read only from that business's own crawled page text. |

The full field list (including the fleet-standard normalized envelope columns this Actor sets to `null` where not applicable, e.g. `value_usd_normalized`) is in [`.actor/dataset_schema.json`](./.actor/dataset_schema.json).

## Reliability

Every outbound call - OSM Overpass, the discovered business's own website, and (when configured) Hunter.io, People Data Labs, or the Anthropic API - goes through a shared `fetchWithRetry` helper with exponential-backoff retry (each retry's delay doubles from a 500ms base), triggered on network errors, HTTP 429, and any 5xx response; individual call sites configure 1-2 retries for their specific external host. A 4xx response other than 429 (e.g. a 404 or a BYOK vendor's 401) is returned as-is rather than retried, so callers can inspect and handle it directly. If a business's site can't be fetched, is disallowed by robots.txt, or looks like a client-rendered SPA with no server-delivered content, the record is marked `websiteContentUnavailable: true` rather than escalating to a headless browser - a disclosed coverage gap, not a silent failure. Cross-run lead identity (`skipKnownLeads` and the `is_new` field) is persisted in a named Apify key-value store, capped at the 20,000 most-recently-seen leads, so it survives independently of any single run.

## Contributing & Local Setup

This repository ships the Actor's real, buildable TypeScript source (`src/`, `package.json`, `test/`) - local development against real logic is fully possible here:

```bash
git clone https://github.com/stefanoseggio/actor-18-b2b-lead-magnet.git
cd actor-18-b2b-lead-magnet
npm install
apify login              # once per machine
npm run start:dev        # tsx src/main.ts, reads ./storage/key_value_stores/default/INPUT.json
# or: apify run           # full local Actor run via the Apify CLI
npm test                 # vitest run
```

Set `ANTHROPIC_API_KEY` in your environment (or Actor input secrets on the platform) to exercise the `includeIntentScore` path locally; everything else runs with no third-party credentials.

Bugs, source-coverage requests, or proposed new input fields (e.g. an additional discovery mode or enrichment provider) are welcome via GitHub issues/PRs on this repository, or through the Apify Store's Issues tab on the [live Actor page](https://apify.com/stefano_seggio/actor-18-b2b-lead-magnet) for non-code questions.

## Support & Enterprise SLA

This Actor is built and maintained by an independent developer, not a staffed vendor team - there is no dedicated support desk or contractual uptime SLA on offer. Questions, bugs, or source-coverage requests are handled through the Apify Store's Issues tab and are typically addressed within 48 hours.

---

This Actor is part of **Delta Registry** — pay-per-event regulatory & compliance data infrastructure built and operated by Stefano Seggio. For professional inquiries or enterprise licensing, connect on [LinkedIn](https://www.linkedin.com/in/stefanoseggio-deltaregistry); for the rest of the fleet, see [github.com/stefanoseggio](https://github.com/stefanoseggio).
