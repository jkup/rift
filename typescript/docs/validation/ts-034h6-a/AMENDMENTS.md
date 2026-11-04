# H6-A retained checks and compiler review

Coordinator approval arrived from chat `01a196aa-fd06-7dc0-91d3-cfee750bcd19`
on2026-11-04 after independent reproduction. The exact `proposal.json` helper
and four replacements are applied only to the new driver. The final actual
driver passes3728/3728 static statements, separate zero-dynamic coverage and
A01–A09 in both hosts for both runtime inputs. `kernel-gate.json` and
`kernel-results.json` supersede the failed initial gate; all54 old gates remain
from the completed full build because production source did not change.

The initial driver Node run stopped at a host builtin named `get tag`; Rift's
existing builtin-name validation rejects spaces. Renaming this test hook to
`getTag` makes the full A01–A09 Node matrix pass. No production name validation
or semantic assertion changed.

The first native driver build rejects four `PropertyKey[].join()` expressions
with SC1090. `compiler-investigation/driver-before.ts.txt`, `driver-before.json`
and `dynamic-before.log` preserve the exact source and diagnostics. The separate
four-line `keys-before.ts` reproduces the unsupported string/class union join.
`keys-proposed.ts` compares exact length and elements instead, rejecting a symbol
lookalike, reordered keys and an extra key. It typechecks, builds static-only,
reports10/10 static and zero dynamic, and prints `true,false,false,false` on both
hosts. `proposal.json` records the four proposed substitutions and helper.
The same union-join limitation and direct comparison pattern already appear in
accepted `ts-033er-b/key-join-before.ts`/`key-join-after.ts`; the required inherited
replay retains that earlier evidence unchanged.

The initial standalone reduction attempted Node's strip-only TypeScript loader,
which rejects constructor parameter properties. That failed attempt is retained
in `reduction-strip-only-attempt.json`; final `reduction-results.json` uses the
normal pinned TypeScript compilation lane without changing the reduction source.

Coverage also identifies a dynamic adapter at the throwing test poison callback.
The assignment explicitly permits actual Builtin callback annotations; the
callback now explicitly returns `Completion`. Its body and full four-parameter
signature are unchanged. No production callback API change is needed.

The first sandboxed native build could not locate Zig's installation libraries.
The retained sandboxed host/observation runs also hit filesystem and symlink
permission failures. Approved runs use the same pinned compiler and unchanged
tests with installation/filesystem access. No skips or weakened gates are used.

A complete unapplied proposal was also built at3728/3728 static while review
was pending. Its standalone TypeScript command omitted `--types node`, so it
stopped before execution; `driver-proposed-types-attempt.json` retains that
command error. The actual driver uses the unchanged repository tsconfig and
passes typechecking and execution. The proposal runner now includes the missing
types flag for reproducibility; final actual-driver evidence is authoritative.
