# TS-463: nullable parameter narrowing and instanceof

Pinned scriptc 0.4.7 rejects `repro.ts` with SC1090 at the `instanceof`
expression. It analyzes three statements and blocks one. The optional parameter
is first narrowed from `Environment | null` to `Environment`; the compiler then
reports a statically decided test on a computed operand.

`control.ts` performs the instance test before the null check. It builds with
`--tier static-only`, reports all four statements static with zero dynamic
statements, and prints `true false` under both Node and native execution.
Both forms preserve the nullable guard's intended acceptance. This is a
compiler-specific ordering constraint, not a JavaScript semantic difference.

The diagnostic's suggested local binding did not fix this reduced case. Moving
the null-first check into a separate helper also reproduced SC1090. Those
attempts remain in `build/private-environment-probe/` with raw build/coverage
results. The successful complete control report is `reordered-reviewed.json`.

The full private-environment candidate initially reports BUILD-FAIL for this
guard. Its original source, native log and build/coverage report are retained
under `build/private-environment-capture-draft/build/` and
`build/private-environment-capture-initial-compiler.log`. Full-engine acceptance
requires a fresh build and both-host validation after the guard is reordered.
