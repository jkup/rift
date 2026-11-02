# TS-027A matrix implementation map

All 125 rows and listed variants in [the frozen matrix](../ts-027p/matrix.md)
are exercised by `test/in-operator.ts` and the runtime CLI cases registered in
`tools/run-guests.mjs`. The two found-token diagnostic suffix corrections are
recorded in [the evidence](README.md); all other literal oracles are unchanged.

| Matrix rows | Named implementation scenarios / checks |
|---|---|
| V1-V3, V9, V16, V20-V23 | Parsed source table; separate array own-index/length/nonenumerability checks |
| V4-V8 | Falsy value variants, fixed descriptors, inherited descriptors, deletion revealing parent, null roots |
| V10-V11 | Every primitive spelling, both zero signs, exact UTF-16 strings and unrelated key |
| V12-V15 | Equal-description distinct symbols, inherited symbol, canonical symbol result/hint, standard symbol wrapper |
| V17-V19 | Boolean/Number/Symbol RHS payload retention; guest/builtin/Function.prototype callable RHS, never called |
| V24-V26 | Inherited array holes before/after prototype deletion, deleted index, 2^32-1 ordinary key |
| V27-V30 | Surrogate-pair and empty wrappers, virtual/inherited indices/length, nonindices and ordinary string/symbol keys |
| V31-V32 | Poisoned property value untouched, 10000-ancestor iterative presence and absence |
| E1-E5 | Literal LRKCH/L/LR traces, all eight invalid RHS variants, invalid RHS beats poisoned conversion |
| E6-E9 | Left/right missing binding and TDZ locations, no conversion or RHS call |
| E10-E17 | Lookup/hook sentinel identity, noncallable/object-result failures, null/undefined fallback, skip and fresh fallback |
| E18-E23 | RHS mutates/rebinds key, hook rebinds target/adds/deletes/changes prototype; captured identities and final storage |
| E24 | Array shrink with and without inherited index, exact length0/no own1 and one Has |
| E25-E27 | Has sentinel; foreign hook/lookup/Has host fault identity and restored state |
| E28-E30 | apPbqQKCH with individual counts, primitive member rejection after p evaluation, poisoned own/inherited target Get |
| E31-E32 | Foreign defining Realm/receiver/hint and restored caller at Has; mutation survives original sentinel |
| P1-P17 | Exact precedence/association source table, RHS2, deletion/assignment effects, short circuit, member-call ordering, erased parentheses |
| P18-P23 | Located exact syntax failures, word-only admission, reserved names, unchanged private/unsupported syntax |
| P24-P28 | Five terminators and comment variants with invalid-RHS locations; named/anonymous inherited and saved Function toString; start location and nesting guard |
| R1-R7 | Exact four-tick primitive path, each step boundary, invalid RHS before conversion, depth3/no calls |
| R8-R12 | Five/six/seven conversion ticks, one/two calls, key-tick and call-limit failures |
| R13-R17 | Seeded256/255 frame guards, tick priority, two operand calls/four ticks, cumulative eight-tick failure |
| R18-R23 | Host limits0/1/2/default64; guest0/2/default64; step14 boundary; both same/foreign defining Realm |
| R24-R25 | Success/guest throw/host fault/step/call/frame cleanup and subsequent operation; deep walk four ticks |
| C1-C3 | Committed runtime-read success/effects/injected fixtures, independent literal stdout |
| C4-C7 | Committed CLI parse/runtime/competing/parse-before-effects fixtures; direct interpret no-effects assertion |
| C8 | audit.mjs preserves all182 case names/expected records and28 gate entries, independently re-parses29 coverage reports |
