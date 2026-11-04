# Map regression amendment to unaccepted H6-CP ab0a384

This bounded actual-type experiment confirms a **newly triggered capability
regression**. It is not an unchanged limitation merely because the rejection
branch already existed. This supersedes the original proposal's tentative
source-derived characterization. Candidate ab0a384 is NOT accepted. No C code,
map fix, constructor shadow/exemption, old test change or scope adoption occurs.

## Literal result

With B production unchanged, a Script GuestArray inherits
Array.prototype → Object.prototype. Before the simulation, reading constructor
returns undefined. Trusted setup then creates a builtin named Object with B's
actual createBuiltinConstructor factory and links Object.prototype.constructor
to it with Wtrue/Efalse/Ctrue. The builtin has real matched call/construct slots
and an immutable prototype property; its callbacks throw if executed. Neither
callback is executed in any control. There is no fake callable record, permit
seam, public Object implementation, or global installation.

| Control | Before | After | Effects before → after | Callbacks | Result allocations |
|---|---|---|---|---|---|
| Script empty array | fresh [] | unsupported runtime.map-species | LK → LK | 0 → 0 | 1 → 0 |
| Script one-element array | fresh [7] / [11] | unsupported runtime.map-species | LKEC → LK | 1 → 0 | 1 → 0 |
| Ordinary object with poison constructor getter | fresh [7] / [11] | same | LEC → LEC | 1 → 1 | 1 → 1 |
| Array own constructor=undefined | fresh [7] / [11] | same | LKEC → LKEC | 1 → 1 | 1 → 1 |
| Array own constructor=7 | unsupported runtime.map-species | same | LK → LK | 0 → 0 | 0 → 0 |
| Array throwing constructor getter | exact same abrupt Completion and Value | same | LKG → LKG | 0 → 0 | 0 → 0 |
| Array constructor getter returning undefined | fresh [7] / [11] | same | LKGEC → LKGEC | 1 → 1 | 1 → 1 |
| Invalid callback plus throwing constructor getter | TypeError callback before constructor Get | same | L → L | 0 → 0 | 0 → 0 |
| Legacy empty / one-element arrays | fresh [] / [7] / [11] | same | LK / LKEC unchanged | 0 / 1 unchanged | 1 unchanged |

L = length Get; K = constructor Get; G = constructor getter body; E = element0
Get; C = callback body. Real GuestArray/GuestObject subclasses record reads while
delegating to super; a Realm subclass counts actual result createArray calls.
The callback checks exact source identity, index0, payload and defining Realm.
Result checks require a fresh genuine GuestArray, intrinsic array prototype,
exact length and element. No returned result is substituted by the test.

Script rows execute the host bridge through the real guarded Script dispatcher
using `probe();` (two source ticks); the successful one-element map adds one
iteration tick. Rejection and empty results remain at two. Legacy rows invoke
the bridge through the real Evaluator with zero source ticks; one iteration adds
one. Every exit checks idle counters/Realm; Script abrupts retain input source
and Realm. Legacy roots remain without constructor in both stages, as C is
Script-only. The own-undefined row is a diagnostic positive control, **not a
proposed production shadow or workaround**.

## Executed evidence and reproduction

`frozen.json` was written before the corrected probe ran. Independent literal
stdout tables specify 20 rows per input, for input-a=7 and input-b=11. Both Node
and native match all 40 rows each (80 executed rows). `results.json` retains the
bounded strict TypeScript compilation, Node stdout, static-only native build,
separate coverage report and native stdout. Coverage: **3779/3779 static, zero
dynamic**. This is one evidence probe, not a full native suite or C feasibility
claim. The binary and emitted JavaScript live only in ignored local build/.

The first attempt used an invalid builtin initial name containing a space.
`first-probe.ts`, `first-frozen.json`, `first-results.json` retain that test-setup
failure. Renaming only the getter to getConstructor corrected the setup; every
literal expected output and row remained byte-identical, verified by audit.mjs.
`sandbox-results.json` retains the subsequent successful Node rows and native
Zig installation-access failure plus passing static coverage. The approved
rerun with installed Zig access produced results.json. No compiler workaround,
pin, semantic expectation or production source was changed.

```powershell
node typescript/docs/validation/ts-034h6-cp/map-regression/audit.mjs
node typescript/docs/validation/ts-034h6-cp/verify.mjs
# Optional targeted reproduction; no full suite:
node typescript/docs/validation/ts-034h6-cp/map-regression/run.mjs replay-results.json
```

Do not regenerate frozen.json to accommodate differing runtime results. Audit
checks its hashes, literal stdout in both lanes, original freeze equivalence,
and rejects a mutation hiding the empty-array regression. The original CP files
and all production/old tests remain unchanged. Its historical UNEXECUTED labels
still apply to C traces; only this separate bootstrap simulation was executed.

## Consequences and smallest principled next scope

Adding a normal Object constructor link changes **all default Script arrays**
with this inherited chain and no own constructor override, including length0.
The internal map helper's valid-callback path becomes unsupported before result
allocation, iteration or callback. The lack of a public Array.prototype.map does
not erase the regression in the existing internal capability. Existing legacy
tests and B's explicit constructor=7 negative cannot detect that new loss.

Two honest alternatives require an explicit reviewed decision:

1. Accept the internal capability regression as a deliberate C tradeoff. State
   the new Script-array restriction and retain a positive-before/negative-after
   control; do not label it unchanged or weaken existing validation silently.
2. Keep C unassigned until a separate bounded default/species proposal establishes
   correct constructor/species selection for this inherited case and its negative
   neighbors, with preserved order, abrupt identity, Realm and budget behavior.
   Review the exact production ownership and test migration before implementation.

**Recommendation: option 2.** The smallest principled next assignment is a
design/evidence amendment for the existing map helper's default/species selection,
not a broad Array feature or public map registration. It must decide the required
well-known species identity/access and default-result rules, distinguish supported
default selection from genuinely custom species still outside scope, and freeze
accessor/abrupt/Realm/allocation controls before any fix. Whether more than the
map file is necessary must be determined in that review, not hidden inside C's
three-file allocation. Simply exempting this Object by identity/name, ignoring
constructor, or shadowing it with undefined would hide the semantic dependency.
This amendment implements none of those alternatives and does not authorize a
successor. Stop for actual and independent second review.
