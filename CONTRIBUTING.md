# Contributing

Start with [README.md](README.md), the [project goals](docs/project-goals.md)
and the [architecture reading guide](docs/architecture-decisions.md).
[AGENTS.md](AGENTS.md) contains repository instructions for coding agents.

## Development checks

With Node >=24, run from the repository root:

```sh
npm ci
npm run format
npm run lint
npm run test:readability
npm run typecheck
npm test
```

Follow the [readability policy](docs/readability.md). Keep full compiler-required
callback arity and observable evaluation order. Do not increase structural
allowances or widen ignores to make a change pass. After reducing existing
structural violations, run `npm run lint:ratchet`.

Native semantic changes require relevant fresh native checks using the
[pinned compiler](toolchain/scriptc/README.md). Toolchain/integration changes
also require `npm run test:compiler`. Keep static-only compilation and the
independent zero-dynamic coverage gate. See the
[validation reference](docs/usage.md#validation) for full guest and Test262 setup.
Typechecking emits `build/node`; do not run it concurrently with tests consuming
that output. Report tested scope and failures explicitly.

## Finding your way around

The [layout guide](docs/repository-layout.md) explains each root entry. Runtime
inputs in `test/fixtures/` include deliberately invalid syntax;
do not format or rewrite them as incidental cleanup. Saved reports under
`docs/validation/` retain their original paths, measurements and failures.

Keep mutable guest state in a Realm, guest control flow in completion records,
and I/O outside the semantic core. Never run guest code through host eval,
Function, vm or a dynamic compiler fallback.

Check [TASKS.md](TASKS.md) and [COORDINATION.md](COORDINATION.md) before starting
shared-checkout work. Keep these files short: current ownership, scope and final
acceptance belong here; detailed transcripts belong in validation evidence.
