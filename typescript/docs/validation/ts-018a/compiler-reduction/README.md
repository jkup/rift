# Reduced throw-only callback adaptation

Observed in the first authorized full native build of TS-018A: the realms driver
built with static-only, but coverage reported two dynamic statements in three
callback adapters at original lines 258, 259 and 331. The gate correctly returned
DYNAMIC despite the report also saying 100% static. The original driver,
explain-dynamic output, full build transcript and per-entry JSON are retained here.

The smallest reduction is inferred.ts: assigning a throw-only arrow to a function
type with a result record infers a never return. All declared parameters are
present, so this is distinct from the existing shortened-parameter workaround.
scriptc 0.4.7 builds it with static-only, but reports one dynamic adapter/statement.
explicit.ts differs only by the explicit Result return annotation. It builds and
reports zero dynamic statements. Both print `throw callback passed` under Node
and the rebuilt native executable, after checking the exact host exception.

Commands (from typescript; installed Zig 0.17.0 on PATH with library access):

```powershell
node_modules/scriptc/bin/scriptc.exe coverage docs/validation/ts-018a/compiler-reduction/inferred.ts --explain-dynamic
node_modules/scriptc/bin/scriptc.exe coverage docs/validation/ts-018a/compiler-reduction/explicit.ts --explain-dynamic
node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-018a/compiler-reduction/inferred.ts --tier static-only -o build/inferred-throw.exe
node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-018a/compiler-reduction/explicit.ts --tier static-only -o build/explicit-throw.exe
node docs/validation/ts-018a/compiler-reduction/inferred.ts
node docs/validation/ts-018a/compiler-reduction/explicit.ts
build/inferred-throw.exe
build/explicit-throw.exe
```

The adopted fix is three explicit ValueCompletion return annotations on test-only
trap callbacks in test/realms.ts. No production workaround, pin change, dynamic
permission, unreachable return, assertion removal or coverage-parser change.
The earlier sandbox logs in the parent directory are a separate Zig installation
access failure, not this compiler coverage failure.
