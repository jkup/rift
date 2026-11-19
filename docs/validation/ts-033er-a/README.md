# ER-A compiler-stop evidence

Base `015543d`, sole writer chat `01a19fdf-c4a4-72f0-9d43-b95842c600f1`.
ER-A is **incomplete**, stopped for the assignment's required bounded coordinator
review of a new compiler failure. This is not an implementation acceptance commit.

`frozen-matrix.md` was copied from accepted ER-P before production edits. The
candidate's eleven production files and host migrations are retained in
`candidate.patch`; `candidate-files.json` lists its changed tracked files.
`attempted-property-accessors.ts` and `accessor-a.txt` / `accessor-b.txt` retain the
unfinished new driver and inputs. Production and existing tests were restored to
the accepted base after capture. Historical evidence, C++, pins, guards and
COORDINATION were not edited. No ER-B or E4 work was performed.

## Compiler boundary and proposed bounded resumption

`partial-native-build.txt` records the first failing existing host gates:
`test/definition-dispatch.ts` and `test/array-storage.ts`. Their overrides still
accept `DataDescriptorUpdate`; the migrated base accepts
`PropertyDescriptorUpdate`. TypeScript accepts this structural override, but
scriptc rejects it with SC1090: parameter types must match the base declaration
exactly. Remaining class/member errors cascade from this rejection. The build
was interrupted after this finding; it is not a complete 46-gate result.

`attempted-definition-dispatch.ts` and `attempted-array-storage.ts` retain those
drivers. `override-before.ts` reduces the boundary to ten lines. Both reductions
pass TypeScript and print `7` in Node. `override-after.ts` changes only the derived
parameter type to match the base: native build passes, prints `7`, and coverage
reports all four statements static. `reduction-results.json` retains exact
commands' results, including rejected-before diagnostics/coverage. Reproduce with
`node docs/validation/ts-033er-a/reduce.mjs` from `typescript`, with installed Zig
on PATH and access to its libraries. `override-*-tsc.txt` / `*-node.txt` retain
the separate Node lane evidence.

Proposed bounded continuation: finish widening **all existing host definition
overrides and their descriptor storage fields** to the base's exact update type,
within the already approved 45-file allowlist. This needs no production API
weakening, casts, dynamic compilation, new ownership or pin change. The original
assignment explicitly required stopping for review before a compiler workaround;
the writer has not applied the reduction's change to the actual host drivers.

## Measurements and limits

- `candidate-typecheck.txt`: the unfinished candidate typechecks.
- `initial-build.txt` and `initial-build-with-zig.txt`: retained environmental
  linking failures (missing Zig PATH, then sandbox library access).
- `initial-build-approved.txt` and `initial-coverage.txt`: initial migrated CLI
  builds with approved Zig access, 2661/2661 static statements. This preceded the
  later frozen-identity correction and does not validate the final candidate.
- `accessor-initial-build.txt`: initial test authoring errors (GuestObject supplied
  where a Value wrapper was required), corrected in the retained attempted driver.
  `accessor-typed-build.txt` then reached linking but lacked Zig PATH.
  `accessor-approved-build.txt` / `accessor-preliminary-native.txt`: preliminary
  driver builds and runs on native with input `seed|7`. This is **partial matrix
  evidence only**, not R01–R28/R33–R34 acceptance or a two-input result.
- `initial-guest-node-results.json` / `initial-guest-node.txt`: 211/212 old Node
  records passed; object-descriptors A6 caught replacement of the stored Value
  wrapper during a SameValue update of frozen data. The candidate patch adds the
  specification's successful no-op path. `frozen-identity-correction-node.txt`
  confirms that driver passes after the correction. Full Node was not rerun.
- `restored-typecheck.txt`: accepted source/tests typecheck after restoration.

No complete native guest run, new additive gate, full accessor matrix, inherited
focused replays, runner/probe/host/observation suites or acceptance preservation
audit is claimed for the candidate. Those remain mandatory before ER-A acceptance.
The old expected records were not edited.

## Resumption notes

Apply `candidate.patch` at the accepted base, restore the attempted new driver to
`test/property-accessors.ts`, and inputs to `fixtures/property-accessors/` only
after the coordinator's bounded review. Continue the migration review before
claiming completion: the patch is an unfinished candidate. In particular, remove
an accidentally added unused `hostContext` inside abstract-equality's `pair`
helper; forward context through Object-toString's GetObserver callbacks rather
than selecting a captured evaluator there; review all explicit host read contexts
and descriptor assertions for full preservation. Complete each frozen row,
including exact budget/Realm/depth cleanup, reentrant array copies, consumers and
profile-transfer controls. Add the native gate and feature inventory only with
the completed implementation and required full validation.
