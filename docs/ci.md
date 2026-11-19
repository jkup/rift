# Continuous integration

The workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

| Job | Coverage | Timeout |
| --- | --- | --- |
| `readability` | Formatting, all four lint layers and custom checker regressions | 10 minutes |
| `node` | Typecheck, runner contracts, full Node guest suite and focused Test262 runner regressions | 15 minutes |

Pushes to `main`, pull requests and manual dispatch run both jobs on Linux with
Node 24. Feature branches use PR checks; manual dispatch can test a branch before
it has a PR. Superseded runs for the same event and branch/PR are cancelled.
There are no path filters. The Node job emits TypeScript once before testing.

The workflow has read-only repository permissions, pins actions to exact commits,
and does not persist checkout credentials. When updating an action, verify the
upstream release commit and update its pin in both jobs. Dependency installation
uses `npm ci` and the committed lockfile.

## Coverage limits

CI does not currently build or execute native Rift, run the complete tooling
suite, or execute the full Test262 corpus. Focused Test262 runner regressions
check the harness; they are not a conformance score. Passing Node checks alone
does not establish native correctness.

Contributors must run relevant fresh native checks for semantic changes and
`npm run test:compiler` for toolchain/integration changes. See the
[validation guide](usage.md#validation) and [compiler setup](../toolchain/scriptc/README.md).
Report the actual scope tested in the pull request.

## Repository setup

Require the `readability` and `node` statuses in branch protection or a repository
ruleset. Workflow files do not configure merge protection. Verify that both jobs
actually execute on a clean hosted run before launch; an account restriction can
prevent jobs from starting regardless of their configuration.

## Future coverage

A native CI lane needs a reproducible distribution of the pinned patched compiler
and Zig version. Cache it by source pin, patch, platform and build recipe; a cache
miss must build or fetch verified assets. Keep static-only compilation and the
independent zero-dynamic coverage gate.

Start with focused native semantic and compiler checks. Measure duration before
adding the full native matrix, broader tooling tests, Windows coverage or periodic
Test262 runs. Keep failures, skips, unsupported cases, limits and infrastructure
errors separate in conformance reports. Use isolated hosted workers for public
contributions.
