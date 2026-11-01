# TS-007 validation — 2026-11-01

Implementation on codex/primitive-computed-keys, starting from the accepted
0819c71 design/main milestone. Coordinator-only documentation commits through
6064fbb were preserved while implementing. Awaiting coordinator review.

## Results

- Typecheck: passes (npm run typecheck).
- Runner: 20/20, zero skipped (npm run test:runner).
- Existing compiler probes: 10/10, Node/native execution and static gates pass.
- Isolated formatting: 36/36 fixed strings in both hosts, 11/11 static statements.
- Node-only reference order probe: 5/5; this does not claim guest object coercion.
- Rebuilt guest suites: 153/153 each, zero skips, timeouts, crashes or harness errors.
  The prior 152 cases remain, including both numeric-key cases now positive;
  the additional compiled host driver contains the detailed matrix assertions.
- All 13 integrated entry points pass static-only builds and separate coverage.
  CLI: 1004/1004; property-key driver: 1209/1209, no runtime-typed statements.
  This exercises the runtime/conversion module cycle without restructuring it.
- git diff --check passes. Pins and C++ are unchanged.

Full subprocess records: [Node guests](guest-node-results.json),
[native guests](guest-native-results.json), [native build/coverage](native-build-results.json),
[compiler probes](compiler-probes.json), [formatting](formatting-results.json).

## Matrix locations

The assertion-bearing test/property-key-conversion.ts driver reads five guest
fixtures at runtime. Its sections cover:

| Contract | Evidence |
|---|---|
| Primitive strings and numbers | Fixed 36-row numeric table exercises formatter, both conversion APIs and raw references; primitive table includes empty/NUL/lone-surrogate strings, null/undefined/booleans on ordinary objects and arrays |
| Names and arrays | access.js asserts zero alias, distinct string -0/01, fractions, negatives, NaN/infinities, holes versus explicit undefined; sparse host checks assert index 4294967294 grows length, nonindices do not |
| Saved reference and receiver | Scenario write replaces selectedBase/selectedKey during RHS, checks exact assigned Value and both old/new objects; direct/inherited method calls replace them during args, assert BKGAAM and exact Get/method receiver |
| Early abrupt | B/K/R sentinel returns assert original completion, payload, diagnostic and location identities across reads/writes/calls; RHS dominates primitive-base and object-key errors |
| Unsupported boundaries | Every primitive base runs key and (for writes) RHS before located TypeError; ordinary/array/callable object keys have throwing read/call traps and reject without hooks |
| Get/Set and calls | Synthetic Get/Set throws preserve exact records; readonly own/inherited and nonextensible false Set reject after RHS; arguments precede callability, throwing first argument skips second; detached guest method keeps undefined receiver restriction |
| Realm and limits | Separate fixture realms own separate objects; same evaluator retains monotonic ticks, reports located exhaustion, cleans frames/calls and recovers without reset; existing operation-context/realm suites retained |

The five prior directly constructed references were migrated without removing
assertions. No parser, AST, Array API or new operator changes were needed.

## Initial failures and resolution

[Initial native results](initial-native-results.json) retain the sandbox linker
failures: Zig could not locate its installation libraries. Rerunning with approved
access to the installed Zig directory resolved all links. No native execution was
counted from that failed build.

That first coverage run also rejected one runtime-typed adapter in the new test:
an object-literal builtin callback that always throws inferred a never return.
Explicitly annotating its return as Completion removed the adapter (the full four
Builtin parameters were already present). The final driver has zero dynamic
statements. This is confined to test annotations, with no engine workaround,
module-cycle failure, changed pin or weakened gate.

## Reproduction

From typescript/, put the installed Zig 0.17.0 directory on PATH and permit access
to its libraries, then run:

~~~powershell
npm run typecheck
npm run test:runner
npm run test:probes
node probes/property-key-conversion/run.mjs
node probes/property-key-conversion/order.mjs
npm run test:guest:node
npm run test:guest:native
git diff --check
~~~

Measured only on Windows x64, pinned Node 26.13.0/scriptc 0.4.7. Fixed formatting
examples are not exhaustive binary64 assurance. Object/string-hint coercion,
symbols, BigInt, primitive boxing, computed object literal keys, new operators,
standard Array APIs and future reference caching remain outside this task.
