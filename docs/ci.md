# CI scope and cost

Reviewed 2026-11-19. The complete workflow inventory is `.github/workflows/ci.yml`.
Both jobs remain useful and retain their status names for branch protection:

| Job | Coverage | Timeout |
| --- | --- | --- |
| `readability` | Formatting, all lint layers, nine checker regressions | 10 minutes |
| `node` | Typecheck, runner contracts, full Node guest suite, Test262 runner regressions | 15 minutes |

Pushes to `main`, pull requests and manual dispatch run CI. Feature branches use
PR checks instead of duplicating push and PR runs; an unsubmitted branch can be
tested with manual dispatch. New runs cancel obsolete runs for the same event
and branch/PR. Main pushes still test the integrated result. No path filters
silently omit tests or leave required workflow checks pending. Draft PRs retain
coverage. Both jobs use standard Linux runners and the existing npm cache.
The Node job uses a shallow checkout and emits TypeScript once before its tests.
No assertions or conformance denominators were removed. Separate jobs preserve
independent feedback and existing check names at the cost of two npm installs.

## Current failure

The repository is private. Run
[44625939890](https://github.com/jkup/rift/actions/runs/44625939890) blocked both
jobs before execution, reporting failed account payments or a spending limit.
This confirms a billing block, but does not establish the exact balance or prove
that a particular $5 budget was exhausted. Workflow edits cannot clear that block.
Check account Billing & plans before increasing a limit. No billing, visibility,
branch-protection or repository settings were changed by this review.

## Coverage to add as the project grows

The current workflow does not compile or execute native Rift, run all tooling
tests, or execute the full Test262 corpus. The added runner regression suite is
ten focused harness tests, not a conformance score.

1. Provision a reproducible Linux compiler distribution from the pinned source
   and patched runtime described in `toolchain/scriptc/README.md`. Verify its
   hashes and Zig version; key any compiler cache by source pin, patch, platform
   and build recipe. Do not rebuild the compiler on every PR or substitute the
   unpatched npm compiler. A cache miss must build or fetch verified assets.
2. Add a focused native PR lane: static-only build plus zero-dynamic coverage,
   expected-result semantic smoke tests and the same runner regressions against
   the native observation driver. Run compiler probes for toolchain/integration
   changes. Use hosted isolated runners for outside contributions.
3. Run the exhaustive native guest matrix and broader tooling checks at release
   checkpoints and on demand; introduce a weekly schedule once duration is
   measured. Broader changes can request this lane before merge.
4. Run a pinned full Test262 corpus periodically using the bounded worker pool.
   Retain selected counts, failures, explicit skips, unsupported cases, resource
   limits, timeouts, crashes and harness/input errors separately. Existing known
   failures require an explicit regression policy, not a blanket green result.
   Keep ordinary logs briefly (for example seven days); preserve release evidence
   separately. Add Windows coverage for platform-sensitive changes and releases.

These are recommendations, not newly enabled scheduled jobs. Measure clean and
cached durations before choosing timeouts or expanding an OS/Node matrix.

## Hosting recommendation

Stay on GitHub Actions. Standard hosted runners in public repositories are free;
larger runners are billed. When Rift launches publicly, the existing runner class
is therefore a good fit for contributor PRs. Private repositories consume the
account's shared included compute allowance; storage is separately metered. See
[GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
and [current plan allowances](https://docs.github.com/en/billing/reference/product-usage-included).

For private development, retain a hard budget and measure summed job time across
all account repositories before raising it. Parallel jobs reduce elapsed time,
but do not eliminate billed compute. There is no measured savings percentage yet:
the inspected recent run never started. The changes eliminate one compilation
per Node job and duplicate feature-branch push runs, plus cancel superseded work.

[CircleCI](https://circleci.com/pricing/) is an alternative with a free tier and
credit-based compute, but adds migration and another quota without an evident
advantage over free public GitHub runners. [Buildkite](https://www.buildkite.com/pricing/)
offers open-source pricing and is worth evaluating if custom native infrastructure
becomes central; obtain eligibility and compute terms before comparing costs.
Self-hosting trades runner charges for machines, maintenance and isolation. Do
not run untrusted public PRs on a persistent personal development machine; use
ephemeral isolated workers if self-hosting becomes necessary.
