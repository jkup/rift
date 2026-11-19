# TS-033A — non-executing strictness inspection

Base `1f81bb2f6eae3ffe9efad8e051599db739ef3f71`, current branch
`codex/test262-classification`, Windows x64, pinned scriptc 0.4.7.
Implements only accepted P1 of [the Script design](../../script-execution.md).

## Interface and implementation

`inspectScript({ id, text })` returns readonly TypeScript records. The opaque ID
and exact UTF-16 source text are copied into a detached unit snapshot; identity
assignment (including repeated-unit order) and cryptographic verification belong
to the host. No normalization, strict prefix or hash implementation is added.
Function offsets refer to this result's single source unit; the containing
function start is explicit, or null for Script enclosure.

The inspector calls the unchanged public parser first. Any rejection produces
`blocked` with only unit, goal, rejection and diagnostic: no partial strictness,
function list, consumed count or AST. Existing certified return errors remain
certified exactly as before. Other rejected rows remain unsupported/resource
results, even where a future full grammar would establish an early error.

On parser success a second pass through the unchanged lexer recovers exact raw
StringLiteral/semicolon pairs at Script and function-body starts. The parsed AST
supplies syntactic nesting and all function locations; there is no independent
grammar or regex parser. A binary search finds each function start in the token
array; with the existing identifier-only parameter grammar its first opening
brace starts its body. This invariant must be revisited before adding parameter
initializers/destructuring. Blocks never create directive scopes. Parentheses,
extended expressions, empty statements and late strings end the prologue.
Supported escapes in other directives keep it open; exact raw quotes determine
Use Strict. Functions inherit enclosing syntactic strictness, not sibling or
caller strictness. Function traversal includes dormant branches and every current
expression/statement form. No guest code is executed.

Complete means full coverage by the *current bounded parser*, not complete
ECMAScript grammar, execution eligibility or early-error certification. No
executable body is returned. This API is not wired into CLI, interpreter,
observation, classifier, Realm or any admission decision. TypeScript readonly is
the API contract, not runtime Object.freeze or an untrusted-host security boundary.

Normative basis: the already retained ECMA-262 2025 §11.2.1–2 excerpts in
`../ts-033p/upstream.json`, and the accepted design's pinned engine262 analysis.
The exact-string and syntactic-inheritance rules are adopted; no upstream code
is copied. ASI, escapes outside the existing subset, named function expressions,
reserved identifiers, duplicate parameters/bindings and identifier delete retain
their existing fail-closed behavior. V01/V02 keep their first duplicate rejection,
not a new tail diagnostic; they expose no metadata or certification. V03 preserves
the return audit's unsupported-tail veto and the valid neighbor.

## Reproduction and oracles

From `typescript/`, with the pinned Zig directory on PATH and toolchain access:

```
node docs/validation/ts-033a/baseline.mjs
npm run typecheck
npm run test:guest:node
npm run test:guest:native
npm run test:runner
npm run test:probes
npm run test:test262
npm run test:observations
node docs/validation/ts-033a/validate.mjs node native
node docs/validation/ts-033a/preserve.mjs
```

The baseline script compiles parser/lexer/syntax/outcomes directly from the exact
base commit, then captures full parse bodies (including partial bodies), diagnostic
messages/locations, rejection tags, source ranges and return-audit records. All 94
historical inputs are reconstructed from their original cases and retained pinned
corpus text, without modifying old evidence. The initial 36 metadata cases were
written and the 130-row baseline captured before production edits. Six additional
visitor/line-trivia controls extend this to 136 rows and 42 metadata expectations.
This is a preservation oracle, not a self-derived strictness oracle: D/V outcomes,
own/inherited strictness and selected exact directive/function offsets are literal
assertions in cases.mjs/validate.mjs. Both hosts read source files after compilation.
The driver also checks source snapshot independence and same-process unit isolation.

Raw per-lane records, all subprocess failures and final matrix results are retained.
The preservation script requires exact equality of all 212 old guest result records
per lane and all 37 old gate entries plus the single additive metadata gate. It
also checks the exact additive build-script edit and rejects unrelated tracked
changes (coordinator-owned COORDINATION changes are recorded separately).

## Retained failures and limitations

Final validation: Node/native each pass 136 exact parser/return-audit baseline
comparisons (all 94 old audit rows plus 42 metadata controls), and all 42 literal
metadata expectations. Both guest lanes pass the exact 212 old records. All 37
old static-only/separate-coverage gates plus the additive gate pass; the metadata
driver is 486/486 static, zero dynamic. Typecheck, runner 20/20, probes 10/10,
host 73/73 and real Node/native observation controls 16/16 pass. No skips.
`preservation.json` binds exact source SHA-256 values; full raw records accompany
the logs. Coordinator-only commit `29f418b` advanced the shared branch during
validation; its COORDINATION edit is excluded from writer ownership and hashed.

`literal-offset-initial.log` and `line-offset-initial.log` retain two hand-counted
test-offset errors: sibling outer/end boundaries were five units too large and
the mixed-line fixture's end was six units too large. Source strings and parser
behavior were unchanged; the expected offsets were corrected by counting the
literal text. `native-initial.log` retains the known Zig library sandbox-access
failure; the earlier PATH-less attempt reported zig ENOENT. `host.log` retains
Windows sandbox EPERM temporary-ledger renames; unchanged tests were rerun with
approved access. An initial orchestration edit used a duplicated typescript path
and made no file change; the working-directory-relative path was corrected. The first commit attempt lacked Git author configuration in the escalated environment; publication uses the existing branch author identity as command-local configuration.

Only finite Windows-x64 tests are claimed. No Script execution, global/declaration
semantics, sloppy execution, new strict-error rule, conformance admission or
performance claim. Historical evidence, parser/lexer/AST types, compiler pins,
C++, CL-006 and coordinator ownership are preserved. No successor or main merge.
