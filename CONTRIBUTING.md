# Contributing

Rift is meant to make a JavaScript engine understandable to a TypeScript developer.
Keep implementations clear and preserve JavaScript's observable behavior. The API
is experimental; internal changes are welcome when code, tests and docs move together.

Start with the [architecture guide](docs/architecture.md) and
[compiler constraints](docs/compiler-contract.md). `src/` holds the interpreter,
`test/` its drivers and fixtures, and `tools/` the build and test runners.

## Bugs and changes

Open a [GitHub issue](https://github.com/jkup/rift/issues) with a small example,
expected and actual output, revision, OS, Node version and execution lane. Include
compiler and coverage diagnostics for native failures. Discuss substantial changes
before implementing them. In a PR, explain what changed, why, and what you tested.

Use the ECMAScript specification to resolve semantic questions. Credit algorithms
and code adapted from other projects. Keep guest state in a Realm, guest control
flow in completion records, and I/O outside the semantic core. Never execute guest
code through host eval, Function, vm or a dynamic compiler fallback.

## Checks

With Node 24 or later:

```sh
npm ci
npm run format
npm run lint
npm run test:readability
npm test
```

`npm test` runs the runner tests, builds TypeScript and runs Node guest tests.
`npm run typecheck` also emits the Node build. Semantic changes need relevant fresh
native checks; toolchain or integration changes need `npm run test:compiler`.
See [validation](docs/usage.md#validation) for setup. Keep static-only compilation
and zero-dynamic coverage. Report failures, skips and untested scope honestly.
Expected-result assertions must remain; do not shrink conformance denominators.

Do not build Node output while tests read it, or replace native binaries while
they are running. Keep source fixed during tooling tests that check its hashes.
When sharing a checkout, coordinate one writer and preserve unrelated changes.
Track work in issues and PRs, not session logs in the repository.

## Readability

Use clear names, early returns and helpers with a single job. Preserve evaluation
order, including getters, coercions and abrupt completion. Use braces, avoid nested
ternaries and assignments in conditions, and keep every compiler-required callback
parameter. Prefix intentionally unused parameters with `_`.

Oxfmt uses four spaces and a 100-column target without sorting imports. Oxlint
checks correctness and unsafe typed operations; custom checks enforce semantic
import boundaries, compiler constraints and structural limits. Generated tables
and guest fixtures are excluded. Fixtures may contain invalid syntax or pinned
bytes: do not format them as incidental cleanup.

Production functions are limited to 100 nonblank, noncomment lines, files to 600,
and nesting to four levels. Tests and test helpers are exempt from size limits,
but retain nesting checks. `.readability-baseline.json` records existing exceptions.
New or growing violations fail. After reducing one, run `npm run lint:ratchet`.
Do not increase allowances, widen ignores or disable rules to pass a check.
Policy changes need explicit review. Do not split coherent code into arbitrary
wrappers merely to meet a metric.

A suppression must name the rule, apply to one line and explain why after `--`:

```ts
// oxlint-disable-next-line no-unused-expressions -- Reading this getter is the operation whose abrupt completion the test asserts.
target.value;
```

## CI

The `readability`, `node` and `node-windows` jobs run on main pushes, PRs and manual
dispatch. Formatting and lint run on Ubuntu; Node guest and focused tooling checks
run on both Ubuntu and Windows with Node 24. Windows checkout preserves the
repository's fixture bytes. The jobs check TypeScript, readability regressions,
guest results, the Test262 runner and release tooling. They do not run native
builds, the complete tooling suite or the full Test262 corpus. Require all three
statuses in repository settings; the workflow does not configure merge protection.

The manually dispatched `Native release` workflow builds Windows x64, Linux x64,
and macOS arm64/x64 packages and creates a draft preview after all four pass. See
[native releases](docs/native-releases.md) for its checks and validation scope.

Actions are pinned to commits and have read-only repository permissions. When
updating an action, verify its upstream release commit and update every job that uses it.
