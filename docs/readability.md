# Readability checks

Rift should remain understandable to a TypeScript developer who is learning the
interpreter. Automated checks enforce a consistent floor; reviewers still need
to assess names, responsibilities, evaluation order and whether a helper makes
the code easier to follow.

## Daily workflow

```sh
npm ci
npm run format
npm run lint
npm run test:readability
npm run typecheck
npm run test:runner
```

Run relevant Node and fresh native semantic checks as described in README.md and
the compiler contract. Toolchain/integration changes also require `test:compiler`.
Typechecking emits `build/node`; do not run it, `build:node`, or probes while a
Node guest/tooling test is consuming that output. Tooling contract tests also
hash source files: freeze source edits during their run.

CI's `readability` job checks formatting, all four lint layers, and the custom
checker regression tests. The existing `node` job retains typechecking and
semantic tests. Repository administrators should require both job statuses in
branch protection. Adding workflow jobs alone does not configure branch protection.
The 2026-11-19 setup check returned GitHub HTTP 403 for protection and rulesets:
this private repository needs GitHub Pro or public visibility for those features.
CI is configured; merge blocking is therefore not enforced by the current plan.
See [CI scope and cost](ci.md) for triggers, timeouts, the billing diagnosis and
recommended native/conformance coverage.

## Tools and scope

The lockfile pins Oxlint 1.94.0, Oxfmt 0.79.0, oxlint-tsgolint 7.0.2007 and
oxc-parser 0.159.0. The TypeScript and scriptc pins are unchanged. Oxfmt uses four
spaces and a 100-column target. Import and package sorting are disabled to keep
evaluation order and intentional grouping intact.

The checks cover handwritten code in `src`, `test` and `tools`, plus
the toolchain archive preparation script `toolchain/scriptc/prepare.mjs`.
Generated Unicode/timezone tables, build output, vendored toolchain code,
historical evidence, guest fixtures, benchmark workloads and examples are excluded. Guest programs
are interpreter inputs, including intentionally invalid syntax; formatting them
would change test locations and inputs. Byte-pinned JSON manifests are also
excluded. Generators and their surrounding handwritten code remain checked.

| Command | Purpose |
| --- | --- |
| `npm run format:check` | Check formatting without writing |
| `npm run lint:basic` | Correctness, unused bindings and explicit readable control flow |
| `npm run lint:typed` | Unsafe TypeScript operations and exhaustive union switches in `src` |
| `npm run lint:policy` | Semantic import boundary, compiler field restriction and suppression policy |
| `npm run lint:structure` | Function/file size and nesting ratchet |
| `npm run lint:ratchet` | Remove or lower resolved structural allowances; refuse new/growing violations |

On the Windows development checkout, three local runs including Node process
startup measured median times of 121 ms for formatting, 106 ms for basic lint,
468 ms for typed lint, 658 ms for policy and 1,370 ms for structure. These are
local measurements under concurrent validation load, not CI guarantees. npm's
wrapper overhead is additional. That measurement covered 919 formatting inputs
and 911 code files; the final scope also includes the toolchain setup script
(920 formatting inputs and 912 code files).

## Rules with a purpose

Use braces for every control-flow body. Replace nested conditional expressions
with explicit branches or a clearly named intermediate value. Keep assignments
out of conditions and avoid comma expressions. Unused declarations and explicit
`any` are errors. The correctness category also checks common runtime mistakes.
Typed checks reject unsafe assignments, calls, member access and returns; union
switches must cover their alternatives or have an intentional default.

Keep full compiler-required callback signatures. Prefix intentionally unused
parameters with `_`; deleting parameters can change native compilation. Do not
apply blanket unused-parameter or import-sorting fixes. Preserve guest callback,
getter, coercion and abrupt-completion order when extracting an expression.

Host `eval`, `Function` and `vm` imports are forbidden. Semantic modules may only
import other semantic modules inside `src`; they cannot import host entry points,
Node modules or tools. The host allowlist is `cli.ts`, `observation-driver.ts`,
`script-observation-driver.ts` and `script-observation.ts`. The core also rejects
console/process/require globals. This is an architectural guardrail, not a proof
against every indirect host capability. Mutable guest state still belongs to a
Realm, and guest control flow still uses completion records.

Class fields literally named `prototype` are rejected because of the pinned
compiler's field restriction. Use a descriptive alternative such as `proto` or
`prototypeSlot`; computed dynamic property keys are not literal field names.

Three unsuitable correctness defaults are explicitly off: `no-this-alias`
(linked environment traversal), `no-thenable` (guest Promise implementations),
and `no-new-array` (deliberate sparse arrays). Strict boolean-expression rules,
mandatory annotations everywhere and alphabetical import sorting are not enabled:
they add noise or risk without making this code clearer.

## Exceptions and structural limits

New production functions should stay within 100 nonblank, noncomment lines;
production files within 600; control-flow nesting within four levels. Size
checks apply to interpreter and production tooling, including the guest runner.
Files under `test`, tooling `*.test.mjs`/`*.integration.mjs` files and
`test-support` modules are exempt from size limits, but retain nesting checks.
Flat `else if` chains do not
add depth, and callbacks are measured independently.

The initial baseline has 173 measured size/depth exceptions. It records each
file/function and exact observed value, rather than ignoring entire modules.
Existing large interpreter dispatchers remain explicit debt; this cleanup does
not claim they have all been decomposed. Any new or larger violation fails.
Shrinking a violation requires `npm run lint:ratchet`, so old spare allowance
cannot silently be reused. Renaming or moving a baselined function may require
a reviewed baseline migration; the ratchet deliberately refuses to infer one.

Prefer a coherent helper with a clear responsibility over splitting at an
arbitrary line count. Do not compress lines, hide branches in callbacks or add
one-use wrappers merely to satisfy a metric. Review changes to tool configs,
host allowlists, structural limits and the baseline as policy changes. Never
raise an allowance or widen an ignore solely to make a feature pass.

Only rule-specific `disable-next-line` or `disable-line` comments are permitted,
with a meaningful explanation after `--`. Basic lint rejects unused directives.
For example:

```ts
// oxlint-disable-next-line no-unused-expressions -- Reading this getter is the operation whose abrupt completion the test asserts.
target.value;
```

The protocol codec has one explained conditional exception to retain its pinned
source-structure contract. Other exceptions document intentional test behavior,
such as NUL matching or a restoration assertion in `finally`. A suppression is
not a substitute for fixing a readability problem.
