# RegExp instruction union conversion

scriptc 0.4.7 rejects repro.ts with SC2003 at emit(atom), despite TypeScript's
preceding discriminant check excluding the incompatible named-reference arm.
Coverage identifies the same blocker: six of seven statements compile
statically. Both source unions contain a named arm, but its payload changes from
a string name to numeric indices at the compiler boundary.

control.ts constructs each remaining instruction explicitly. It builds with
static-only, reports all eleven statements static and prints `dot` under both
Node and native execution. The full RegExp feature also passes its focused native
suite and ten both-host regressions with this construction.

From typescript/, with the pinned Zig on PATH:

```powershell
node docs/validation/ts-451-instruction-union/repro.ts
node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-451-instruction-union/repro.ts --tier static-only -o build/instruction-union-repro.exe
node_modules/scriptc/bin/scriptc.exe coverage docs/validation/ts-451-instruction-union/repro.ts
node docs/validation/ts-451-instruction-union/control.ts
node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-451-instruction-union/control.ts --tier static-only -o build/instruction-union-control.exe
node_modules/scriptc/bin/scriptc.exe coverage docs/validation/ts-451-instruction-union/control.ts
build/instruction-union-control.exe
```

The repro build must fail; its coverage command exits zero but reports a
blocker. Preserve that distinction. Original execution records and the full
feature failure remain in build/regexp-instruction-union-probe/reviewed.json and
build/regexp-duplicate-names-draft/build/initial-union-conversion-reviewed.json.
