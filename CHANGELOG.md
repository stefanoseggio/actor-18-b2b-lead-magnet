# Changelog

## 1.1.0 - 2026-09-08

### Added

- **Cross-run lead deduplication.** New `src/state.ts`: a NAMED key-value store (`Actor.openKeyValueStore('actor-18-b2b-lead-magnet-seen-leads')`) persists which leads (by `record_id`) have already been discovered and charged for across runs. New opt-in `skipKnownLeads` input (default `false`, fully backward compatible): when enabled, a lead already known from a prior run is skipped **before** the enrichment waterfall runs (no repeat website crawl, no repeat BYOK/intent-score calls, no repeat `basic_lead`/`enriched_lead` charge) - both a real cost saving and a real compute saving.
- `is_new` (part of the 18-field UMS envelope) is now populated for real: `true` if this exact business was never seen in a prior run, `false` if it was - tracked regardless of `skipKnownLeads`, which only controls whether an already-known lead is skipped, not whether it's tracked. Previously always `null`.
- `src/recordId.ts`: extracted the record-id computation (`osm:<id>` / `seed:<hash of normalized name+website>`) that already existed inside `umsNormalizer.ts` into its own shared pure function, so `main.ts` can check dedup state against the exact same id `umsNormalizer.ts` will stamp onto the final record - a single implementation, not two that could drift apart.
- `LICENSE` (Apache-2.0, matching the fleet standard), `.github/workflows/test.yaml` (lint+build+test CI - this actor had none), `.gitignore`, this `CHANGELOG.md`, `AGENTS.md`.
- `test/recordId.test.ts`, `test/state.test.ts`, `test/seedList.test.ts`: new unit coverage for the id-computation, state-persistence, and seed-list-parsing logic (previously untested).

### Changed

- Test coverage extended but **not exhaustive**: `src/discovery/overpass.ts`, `src/enrichment/websiteCrawl.ts`, `src/enrichment/byok.ts`, and `src/enrichment/intentScore.ts` remain without dedicated unit tests - disclosed here rather than silently left as a gap. These are thin, mockable wrappers around external network calls (OSM Overpass, arbitrary business websites, Hunter.io/PDL, the Anthropic API); `src/http.ts`'s shared `fetchWithRetry` (used by all of them) was independently confirmed to already correctly retry on 429/5xx and pass through other errors - no bug found there, unlike the 429-retry bug fixed the same day on a sibling actor (`actor-22-drug-safety-recalls-monitor`).

### Not added (and why)

- **No registry-style delta engine (NEW_LISTING/STATUS_CHANGE/UPDATED/CLOSED classification).** This actor is a stateless, customer-triggered discovery+enrichment waterfall, not a poller of an enumerable registry - a business's own web presence has no observable "status" field the way a government tender or gazette entry does. Forcing that taxonomy on would mean inventing signals this domain doesn't have. What genuinely applies here - "have I already discovered and charged for this exact business" - is what `skipKnownLeads` addresses instead.
- **No pricing/monetization change.** The existing two-tier `basic_lead`/`enriched_lead` PPE pricing is untouched by this release.
