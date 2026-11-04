# H6-M implementation candidate

Accepted base `5d25b88`; accepted design `624f190`. This directory contains new
evidence only. Actual and independent second review are required before acceptance.
The coordinator owns publication and COORDINATION. C remains blocked.

## Implementation and boundaries

Only `src/array-map.ts` and `src/symbols.ts` change in production. Script operations
read the canonical shared species symbol after the original constructor Get.
Undefined or a null species result takes the existing running-Realm default
allocation path. An initial null constructor is invalid. Invalid selected
nonconstructors produce a genuine language TypeError; actual constructors remain
explicitly unsupported without invocation. Selection does not acquire construction
authority, read a selected constructor's prototype, or allocate a result early.

Legacy selection, callback/length ordering, the saved-length loop, signature and
allocation code remain unchanged. The shared symbol is not installed on guest
objects. No Realm has a real intrinsic Array constructor; its foreign-intrinsic
exception is therefore unrepresentable, not a passed positive control.

The only historical test migration is the exact whole-file MP proposal for
H6-B E24/E25. `preserve.mjs` reconstructs it by byte offsets, checks hashes and
complete file equality, protects other history, compares unchanged map boundaries,
and checks all 60 blocked variants. Historical validators were not rewritten.
New replay copies preserve their checks and redirect evidence to this directory.

## Frozen expectations and reviewed amendment

`freeze.json` hashes copies of all accepted MP tables, inputs and narrative before
production edits. `test-source-freeze.json` records the initial driver and CP
replay source before production edits. Their original contents are evidence of
the freeze, not an assertion that subsequent test corrections were unnecessary.
`oracle-audit.mjs` compares the driver's fourteen literal tables to the freeze.

The parsed-getter narrative omitted the existing nonstrict body lexical-environment
tick. Work stopped, preserved the failure, and reduced it without map or species.
Node/native agreed, with 3644 static statements and zero dynamic. The coordinator
independently rebuilt that reduction and obtained second review before approving
only the new oracle amendment: return total 8, throw total 7; getter ticks 4–5
instantiation, 6–7 body. See `ORACLE-AMENDMENT.md`, `REVIEW-REQUEST.md` and
`development/`. Immutable MP evidence and the evaluator are unchanged.

Other test-construction corrections preserve intended semantics: readonly abrupt
origins are supplied at construction; normal nested results include their `d`
definition event; changing an existing nonconfigurable function prototype uses
a value-only descriptor. The nested event observer normalizes labels in finally
so host throws retain the same observed allocation event. No production compiler
workaround, pin change, expectation relaxation or test authority seam was added.

## Executable controls

The driver reads `probe(7);` or `probe(11);` at runtime. Each input/host executes:

- 308 step-prefix and 224 call-limit controls for all fourteen literal schedules,
  same/cross Realm and fresh/seven-seeded sessions.
- 108 selection dimensions, 56 exhaustive primitive-selection controls, 28
  Object-link and foreign Script-constructor controls, length limits/coercion,
  saved-length/live-presence mutation and running-profile controls.
- 480 accessor abrupt-prefix controls and 2340 all-trace abrupt-prefix controls.
  Guest, engine, resource, unsupported and exact host abrupts cut off effects at
  each reachable constructor/species/element/callback hook, including inner maps.
  Assertions include exact completion/value/origin/diagnostic references, source,
  Realm, counters, resource tuples and no later effects.
- 200 amended parsed-getter controls covering both getter positions, both return
  and throw, same/cross Realm, seeds 0/7, every step prefix and call limits.
- 48 separate-session reentry controls covering normal/guest/host outcomes and
  inner step/call boundaries. An enclosing finally checks the complete restored
  outer frame, Realm, steps, calls and depth, including host unwind. Retained raw
  callbacks reject live, in finally, on reuse and idle without effects.

Both original sessions are reused. Sufficient-budget owners dispatch guarded
resume calls with exact three-tick deltas and original record/Realm. Exhausted
owners retain their immutable limits and reject at the next applicable guard;
they are not silently replaced or reset to manufacture a successful reuse.
The call-limit-2 runs provide successful reuse of both owners after all three
exit modes. Parsed getter failure phases are inferred from the existing inspected
setup/body paths; the public idle snapshot does not expose a past phase.

The 54-row coverage mapping is in `matrix-coverage.json`. X06 remains explicitly
unrepresentable. Repeated dimensions do not inflate the row count or constitute
complete Array.prototype.map support.

## CP bootstrap replay

`cp-replay/` retains the original actual-type trusted Object-link simulation with
new explicit literal outcomes frozen before replay. All 80 rows pass on both
inputs/hosts. The changed outcomes are default arrays after Object linking and
genuine Script TypeError for an invalid primitive constructor. Original CP
regression evidence remains untouched. No Object global or C implementation is
installed by this replay.

## Validation

Final machine records are `map-results.json`, `preservation.json`,
`feature-checks.json`, `error-results.json`, `replays/replays-results.json`,
`replays/suite-typecheck.json`, `cp-replay/results.json` and `oracle-audit.json`.
These records, rather than this candidate heading, establish completion of checks.
The full 212-record guest lanes and all 56 inherited gates plus one new gate are
required; static-only build and separately parsed zero-dynamic coverage are both
required. H1–H6-B/E4, all 17 inherited groups, both Node reflection boundaries,
forged-slot controls, typecheck, runner20, probes10, host73 and observations22 are
also required. No publication, public map, general custom species construction,
Array constructor, C activation, grammar, observer or admission claim is made.

## Final candidate result

All required checks pass; see `completion.json`. Both lanes preserve all212 exact
records with no skips. All57 native gates are static-only and separately zero
dynamic; H6-M is4504 static statements. H1–H6-B/E4, both Node boundaries/slots,
all17 inherited replays, typecheck, runner20, probes10, host73 and observations22
pass. The CP replay passes80 literal rows. Source preservation protects4101 files
and139 unchanged old tests plus the exact approved one-file replacement. All60
variants remain blocked. Initial inherited-replay Zig PATH failure is retained
in `development/replays-initial-results.json`; the approved rerun passed.

The writer stops at this tested candidate for actual/independent second review.
No push, C activation or successor work was performed.
