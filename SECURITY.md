# Security Policy

## Supported versions

This Actor follows [semantic versioning](https://semver.org/) via automated release tagging (see [`.github/workflows/release.yml`](.github/workflows/release.yml)). Only the latest published major version receives security fixes — there is no long-term-support branch for older majors, consistent with this being a single-maintainer, independently-operated Actor rather than an enterprise product with a formal support matrix.

## Reporting a vulnerability

**Preferred: GitHub Private Vulnerability Reporting.** This repository has private vulnerability reporting enabled — go to the **Security** tab → **Report a vulnerability** to open a private advisory visible only to the maintainer until a fix is ready. This is the correct channel for anything that shouldn't be disclosed in a public issue (credential handling, injection risks, dependency CVEs affecting this Actor's real usage, etc.).

**Do not** open a public GitHub issue for a suspected security vulnerability — use private reporting instead so the disclosure stays coordinated.

## What's actually in scope

This Actor's real attack surface, honestly assessed:

- **Optional BYOK credentials.** `hunterApiKey` and `peopleDataLabsApiKey` are optional, customer-supplied input fields marked `isSecret` in `.actor/input_schema.json`. Each key is used only to call that vendor's own domain-search endpoint directly and is never logged, persisted, or forwarded anywhere else — that vendor bills the customer's own account, not this Actor. A leak or mishandling of either field would be a real, in-scope vulnerability.
- **Operator-side model credential.** `ANTHROPIC_API_KEY` is the operator's own environment variable (not a customer input field) used only when `includeIntentScore` is enabled, to score a business's own crawled page text. It is priced into the `enriched_lead` PPE rate and is never exposed to or settable by the caller.
- **No user-supplied code execution.** Input is a fixed JSON schema (`discoveryMode`, `seedList`, `overpassBbox`, `maxLeads`, `includeIntentScore`, `skipKnownLeads`, plus the two BYOK keys above) validated against a real Zod schema (`src/schemas.ts`) — there is no arbitrary-code or arbitrary-URL execution surface.
- **Dependency vulnerabilities** in `package.json`'s real dependency tree (`apify`, `cheerio`, `zod`, `zod-to-json-schema`, and dev dependencies) are a real, ongoing concern — tracked via Dependabot (`.github/dependabot.yml`) and GitHub's own dependency/secret scanning, both enabled on this repository.
- **Third-party site content** fetched during the own-site crawl step is treated as untrusted: it is parsed for emails/text signals only, never executed, and a page that can't be fetched or is disallowed by robots.txt is marked `websiteContentUnavailable: true` rather than bypassed.

## Response expectations

This is an independently developed and maintained Actor with no contractual security SLA. In practice, security reports are typically triaged within 48 hours — the same disclosed norm as this Actor's general support triage (see the README's Support & Enterprise SLA section) — though there is no guaranteed fix timeline. Reports that turn out to be genuine, exploitable vulnerabilities will be credited in the fix's release notes unless the reporter requests otherwise.

## Enterprise / institutional customers

If your organization requires a signed security addendum, a formal disclosure SLA, or a security questionnaire completed as part of procurement, open an issue against this Actor's [Store page](https://apify.com/stefano_seggio/actor-18-b2b-lead-magnet) or connect via [LinkedIn](https://www.linkedin.com/in/stefanoseggio-deltaregistry) — these are handled case-by-case, not something this file can commit to on Stefano's behalf.
