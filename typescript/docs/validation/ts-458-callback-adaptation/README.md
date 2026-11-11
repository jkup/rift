# Callback adaptation enters the dynamic tier

Pinned scriptc 0.4.7, Windows x64, 2026-11-11. Both examples build with
`--tier static-only` and print `throw` under Node and native execution.
Each analyzes four statements. The inferred zero-argument callback in `repro.ts`
introduces one dynamic statement in a compiler-generated adapter (`dyn.this`).
The explicit parameter/return signature in `control.ts` has zero dynamic
statements and passes the normal probe verdict.

Commands: `scriptc coverage <file> --explain-dynamic` and
`scriptc build <file> --tier static-only -o <executable>`.
Raw builds, coverage and both-host outputs are retained in
`build/private-callback-probe/reviewed.json`; detailed coverage is alongside it.

This was found in a test callback for the private-element backend. The runtime
implementation did not need a workaround: the test now states its full builtin
callback contract. The original failed full probe is retained in
`build/private-elements-draft/build/private-elements-initial-dynamic-reviewed.json`.
Continue checking parsed zero-dynamic coverage even when the compiler reports
that every analyzed statement compiled statically.
