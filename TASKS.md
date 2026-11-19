# Current work

## TS-569 — Simple README and logo

Status: complete (2026-11-19). Implementation ownership released.

Simplify the README to purpose, execution model and local Node/ScriptC commands.
Add the owner's emailed Rift PNG unchanged as a repository asset.
Acceptance: required readability, typecheck and runner/Node checks; verify the
quick-start output and README links. No runtime or toolchain changes.

Validation: format, lint, typecheck, readability tests 9/9, runner tests 36/36
and Node guests 1003/1003 pass with no skips. Both Node quick-start examples
produce expected output; every README link and image target resolves. The
downloaded PNG was visually inspected. Native builds and probes were not rerun
for this documentation-only change.

## TS-568 — Open-source repository cleanup

Status: complete (2026-11-19). Implementation ownership released.

Audit every root entry against current build/test consumers. Remove redundant
instructions and obsolete one-off tooling, consolidate historical benchmarks
under docs, and make onboarding and current task state concise. Preserve semantic
source, fixture bytes, compiler pins and saved validation evidence.

Acceptance: format, lint, readability tests, typecheck, runner and Node guests;
verify the documented example, benchmark byte preservation and local documentation
links. No compiler/runtime change is intended; no full native rebuild is required.

Validation: format, all lint layers, readability tests 9/9, typecheck, runner
36/36 and Node guests 1003/1003 pass with no skips. The structural ratchet remains
at 173 exceptions with no baseline change. Both quick-start commands pass;
43 local documentation links resolve. All six moved benchmark Git blobs match
(the initial raw-byte comparison encountered Windows checkout line endings;
Git-filtered hashes verify the preserved tracked contents). No fresh native
build, probes or full Test262 run was performed for this documentation/deletion
cleanup. Runtime source, fixtures, expectations and compiler pins are unchanged.
EditorConfig now agrees with the existing four-space formatter setting.

## Follow-up candidates

No semantic feature is currently assigned. See the
[roadmap](docs/development-roadmap.md) for concrete remaining findings and the
[feature inventory](docs/feature-inventory.md) for supported scope.

TS-566 (bounded Test262 comparison) and TS-567 (readability gates) are complete.
The previous migration backlog and acceptance chronology remain in Git at
`ee58390b78a8fd4f12488fa00af6b1f029d045a9:TASKS.md`; recover with
`git show ee58390b:TASKS.md`. Historical proposals are not current assignments.
