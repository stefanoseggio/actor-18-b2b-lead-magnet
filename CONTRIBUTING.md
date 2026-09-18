# Contributing

This repository ships the real, buildable TypeScript source for the **B2B Lead Enrichment Engine - Contact Discovery & Buying-Intent Scoring (Global)** Apify Actor. It is independently maintained by Stefano Seggio as part of the [Delta Registry](https://github.com/stefanoseggio) fleet — there is no separate contributor team, but external bug reports, source-coverage proposals, and documentation fixes are welcome.

## Local setup

```bash
git clone https://github.com/stefanoseggio/actor-18-b2b-lead-magnet.git
cd actor-18-b2b-lead-magnet
npm install
apify login          # once per machine, needed only for `apify run`
```

No credential is required for the default `basic_lead` path (seed-list or OpenStreetMap Overpass discovery, own-site crawl, DNS/MX plausibility check). To exercise optional paths locally:

- Set `ANTHROPIC_API_KEY` in your environment to run the `includeIntentScore` path (this is the operator's own key, priced into the `enriched_lead` PPE rate — not something a contributor needs to supply for basic development).
- Pass `hunterApiKey` and/or `peopleDataLabsApiKey` in your local `INPUT.json` only if you're testing the BYOK enrichment paths — these are customer-supplied keys billed directly by that vendor, never by this Actor.

## Development workflow

```bash
npm run start:dev     # tsx src/main.ts, reads ./storage/key_value_stores/default/INPUT.json
npm run lint           # eslint
npm run lint:fix       # eslint --fix
npm run format         # prettier --write .
npm run build          # tsc
npm test               # vitest run
```

Local runs against `osmOverpass` hit the real, public `overpass-api.de` mirror — keep `maxLeads` small while developing to stay within its fair-use rate limits.

## Branch naming

- `fix/<short-description>` — bug fixes
- `feat/<short-description>` — new input fields, new output fields, new source coverage
- `docs/<short-description>` — README/documentation-only changes
- `chore/<short-description>` — dependency bumps, tooling, CI changes

## Commit convention

This repository follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

<optional body>
```

Types used here: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`. The `type` prefix drives automated changelog generation via `release-please` (see [`.github/workflows/release.yml`](.github/workflows/release.yml)) — a `feat:` commit triggers a minor version bump, `fix:` triggers a patch bump, and `feat!:`/a `BREAKING CHANGE:` footer triggers a major bump. Non-conventional commit messages are still accepted but won't be reflected in the auto-generated changelog entry for that change.

## Pull requests

1. Fork or branch, make your change, and ensure `npm run lint`, `npm run build`, and `npm test` all pass locally.
2. Open a PR against `main` using the repository's [PR template](.github/PULL_REQUEST_TEMPLATE.md).
3. CI (`.github/workflows/test.yaml`) runs automatically and must pass before merge.
4. Behavioral changes to the Actor's input/output schema should also update `.actor/input_schema.json` / `.actor/dataset_schema.json` and the corresponding README sections in the same PR — schema and documentation drift is treated as a real bug, not a follow-up.

## Scope boundaries

This Actor's own compliance doctrine (see `package.json`'s description and the README's Enterprise Use Cases section) excludes Google Maps from discovery entirely — its Additional Terms and Maps Platform Terms explicitly prohibit building a business-listings database from Maps content, so OpenStreetMap's Overpass API is used instead. More generally, this Actor does zero CAPTCHA-solving, fingerprint spoofing, or WAF-bypass of any kind. A discovery source or enrichment method that requires any of these will be declined regardless of how valuable the data would be.

## Questions or non-code issues

For questions that aren't a code change (pricing, licensing, enterprise inquiries), use the Apify Store's Issues tab on the [live Actor page](https://apify.com/stefano_seggio/actor-18-b2b-lead-magnet) rather than a GitHub issue.
