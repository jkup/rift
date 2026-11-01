# Integrated coverage reduction

Pinned scriptc 0.4.7 rejects `test/conversion.ts` with SC2009 on the builtin arm
of Callable (plus cascading diagnostics), and its separate coverage process
remained busy without output for several minutes in the integrated run. The
build failure was exposed separately in `native-build-only.json` after the
combined runner was interrupted during coverage. That run
was interrupted rather than counted as passing. `coverage-bare.ts` reduces the
entry to importing GuestObject and reading a fresh object's null prototype;
`coverage-bare.ts.json` records a 10-second `spawnSync` ETIMEDOUT with no report.
`coverage-repro.ts` also reproduced with a builtin assignment before reduction.

`coverage-array.ts` adds only a side-effect import of the Array module and passes
408/408 static statements. `coverage-import.ts` imports the Realm module and
passes 461/461; `coverage-realm.ts` actually creates a Realm and passes 465/465.
The accompanying JSON files retain the exact outputs. These are entry reductions
against the actual module graph, not a claimed standalone compiler root cause.
A small independently reconstructed class graph did not reproduce the failure.

In a scratch copy under build/, changing runtime's type-only Realm import to a
value import removed the hang but reported SC1016: GuestObject can be accessed
before declaration at GuestArray's extends clause. That is not a valid fix.
Changing both Realm array types to GuestObject also ended the hang but loses the
frozen exact interfaces and is rejected. Production sources retain their types.

The adopted isolated workaround is an explicit Array module import at the
conversion host-driver entrypoint. The inventory in `coverage-inventory.json`
shows this is the only affected entry among the 21 gates.
This supplies real class definitions to the coverage
analyzer without instantiating a Realm, changing guest behavior, removing a case,
or relaxing static-only or coverage gates. The coordinator explicitly extended
this chat's ownership to `test/conversion.ts` on 2026-11-01 after reviewing the
reduction. Its assertions are unchanged; the only addition is the import and
explanatory comment. No production type/import workaround was adopted. Final
normal-run results are recorded in README.md.
