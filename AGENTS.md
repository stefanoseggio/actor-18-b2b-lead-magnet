# actor-18-b2b-lead-magnet - AI agent notes

Universal B2B Lead Magnet & Intent Enricher. Two discovery modes, then an enrichment waterfall, then normalization to the fleet's 18-field UMS:

- **Mode A - seed list** (`src/discovery/seedList.ts`): customer-supplied names/domains, parsed with zero external requests.
- **Mode B - OSM Overpass** (`src/discovery/overpass.ts`): discovers candidates within a bounding box via `overpass-api.de`'s public interpreter (ODbL-licensed). **Google Maps is deliberately excluded** - its Maps/Earth Additional ToS and Maps Platform ToS both prohibit building a business-listings/mailing-list database from Maps content; this is a compliance decision, not a missing feature.
- Enrichment (`src/enrichment/*.ts`): own-site crawl for contact info, DNS/MX email-plausibility check, optional BYOK Hunter.io/People Data Labs enrichment (customer's own key, customer's own bill - never this actor's PPE), optional Claude Haiku 4.5 intent scoring (operator's own `ANTHROPIC_API_KEY`, priced into the Enriched Lead rate).
- Two-tier PPE: `basic_lead` ($0.002/record) vs `enriched_lead` ($0.015/record, when `includeIntentScore` is on) - see the cost-basis comment block at the top of `src/main.ts`.

## Cross-run lead dedup (added 2026-09-08)

This actor was one of 5 found on the account outside the original 9-actor V2 migration mandate (see `_audit/fleet_v2_reconciliation_report.md` in the portfolio root). Unlike the other 4, it genuinely has **no registry-monitoring delta concept to add** - it's a stateless, customer-triggered discovery+enrichment waterfall, not a poller of an enumerable source. Its own code already documented this reasoning before this pass touched it.

What DID apply, and was added: `src/state.ts` (a NAMED `Actor.openKeyValueStore('actor-18-b2b-lead-magnet-seen-leads')` - not the run-scoped `Actor.getValue()`/`setValue()` bug found on a sibling actor the same day) tracks which `record_id`s have already been discovered, so a repeat run against the same seed list or bounding box can skip (and not re-charge for) an already-known lead when the new opt-in `skipKnownLeads` input is enabled. `src/recordId.ts` is the single shared source of truth for `record_id` computation (`osm:<id>` / `seed:<hash>`), used by both the dedup check in `main.ts` and the final record stamp in `umsNormalizer.ts` - never two separate implementations that could drift.

## Known footguns

- No local `Dockerfile` (and none referenced in `.actor/actor.json`) - Apify's implicit build for this template does `COPY . ./` then `npm install --only=prod` ONLY, confirmed directly against the build log for the sibling actor-22 the same day (`GET actor-builds/{id}/log`) after a real deploy failure there (`Cannot find module dist/main.js`). **`dist/` MUST be committed, not gitignored** - `tsc` never runs in that container (typescript is a devDependency, correctly excluded by `--only=prod`). Rebuild (`npm run build`) and re-commit `dist/` before every `apify push`.
- `mcp/searchB2bLeads.ts` is outside `tsconfig.json`'s `include` (`./src/**/*` only) and outside `eslint.config.mjs`'s lint scope (`**/mcp` ignored) - a standalone MCP-tool entry point, not part of the `dist/main.js` build.
- `.actor/actor.json`'s `meta.templateId` says `"ts-crawlee-cheerio"` but this actor uses plain `fetch()`, not Crawlee - a scaffolding leftover, harmless.
- Test coverage is real but not exhaustive - see CHANGELOG.md's "Changed" section for exactly which files remain untested and why that was judged an acceptable, disclosed tradeoff rather than blocking this release.
