# Changelog

## [1.2.0](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/compare/actor-18-b2b-lead-magnet-v1.1.0...actor-18-b2b-lead-magnet-v1.2.0) (2026-09-19)


### Features

* cross-run lead dedup via named KV store (1.1.0) ([be470e5](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/commit/be470e5de4f397f9a59b036ab0cf3b8d81084acf))
* standardize on multi-stage Dockerfile builder pattern ([#10](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/issues/10)) ([2ae81f4](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/commit/2ae81f47117f2bc687599d11897851adaa6a83bf))


### Bug Fixes

* actually ship dist/ - prior commit's build was a stale no-op ([a1abaa5](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/commit/a1abaa52fd0f20d48c7aa97222715a07d6318262))
* **ci:** pass RELEASE_PLEASE_TOKEN so release PRs skip the bot-approval gate ([fd5e5ba](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/commit/fd5e5ba9079dff9515ad51e2221ee04bf0ba6d40))
* restore dist/ tracking, reverting a regression from the standardize-repo pass ([#9](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/issues/9)) ([593d0a2](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/commit/593d0a25b9d561b56108e7436d36a49b6dda6e13))
* validate seedList is non-empty when discoveryMode is "seedList" ([#12](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/issues/12)) ([2c9b9e9](https://github.com/stefanoseggio/actor-18-b2b-lead-magnet/commit/2c9b9e9d700e51d23adde2c33f66e29ac0965e9b))

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
