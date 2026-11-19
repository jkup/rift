# Array pattern compiler reduction

`collection-key-before.ts` imports Rift's recursive Expr type and reproduces SC2020 when a narrowed array element is passed directly to `Set<Expr>.has`. The compiler reports that collection-key conversion would require a structural copy, which would change identity. A smaller three-arm recursive union did not reproduce the failure; this reduction retains the actual type graph.

`collection-key-after.ts` performs the same membership check through a function whose parameter has the declared Expr type. It builds with `--tier static-only` and prints `1`. The parser uses this boundary only for the affected membership check; it does not copy keys or enable a dynamic tier.

Run from `typescript/` with Zig on PATH:

```powershell
./node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-152/collection-key-before.ts --tier static-only -o build/native/array-key-before.exe
./node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-152/collection-key-after.ts --tier static-only -o build/native/array-key-after.exe
./build/native/array-key-after.exe
```

Original logs: `build/array-pattern-build.log`, `build/array-key-before.log`, `build/array-key-after.log`. The corrected focused driver passes native execution with 8753/8753 static statements and zero dynamic operations before the two additional close/order cases. The final focused test source, including nested close/order and cross-Realm cases, passes both hosts with 8761/8761 static statements and zero dynamic operations. Full integration also passes: 644/644 guests on each host, 291/291 tooling checks and all 154 static-only native entries with parsed coverage. See TASKS.md TS-152 and build/array-pattern-native-results.json.
