# TS-018P inspection and design evidence

2026-11-02. Assigned base `d2c6087`; inspected HEAD `1ee6e7e4101762e7e647458901611ce4468857e5`
adds the coordinator dispatch record. Branch remains `codex/primitive-computed-keys`.
Owner: design chat `01a199b3-8329-7563-9a5b-9ee9c06aa9d6`.

## What was checked

- Read typescript/AGENTS.md, project-goals, compiler-contract, TASKS and
  realm-intrinsic-prototypes; traced actual runtime property storage/dispatch,
  Realm creation, evaluator call entry/finally, string backend, conversions,
  array length and map operations.
- [runtime-inventory.txt](runtime-inventory.txt) retains source search hits for
  storage, object operations, factories, function realm entry and string units.
- [fixture-inventory.txt](fixture-inventory.txt) retains test search hits for
  null-root setup, observer subclasses, no-method assertions, registrations and
  snapshot users. These are review inventories, not test output.
- Read affected assertion blocks in realms, operator-coercion,
  array-length-coercion, array-like, array-map, length-coercion, key-coercion,
  primitive-conversion and definition-dispatch. Keep their existing negatives;
  the design identifies later positive migrations separately.
- Confirmed raw slot traversal in Get/Has/Set is insufficient for virtual String
  indices. Confirmed getOwnProperty and receiver define already have dispatch
  surfaces; no proxy/accessor support is inferred.
- Confirmed TS-017A enters fn.realm before builtin invocation and restores it in
  finally. ToObject needs no new ambient Realm or evaluator.
- Fixed ECMA-262 2025 sections 7.1.18/7.1.21, 10.4.3 and 20.1.3.6/.7 were opened
  through the web tool, including algorithm text rather than only contents links.
  Engine comparison below was fetched through GitHub at an exact revision.

## Pinned engine source record

Repository engine262/engine262, commit
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`.
The source links and adoption/rejection decisions are in
[the design](../../primitive-wrappers.md#evidence-and-sources).
GitHub returned these content blob SHAs; no engine source was copied into Rift.

| File | Blob SHA | Link |
| --- | --- | --- |
| type-conversion.mts | `927950f65f5bddd1abffd19140f2e0c5ee0c0990` | [pinned source](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts) |
| string-objects.mts | `b59f2a0b2dbe48e5377861b02702fd34f1f9dd05` | [pinned source](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/string-objects.mts) |
| BooleanPrototype.mts | `252077d2e9fdf72bb0c180e771fc844ce7dd62f3` | [pinned source](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/BooleanPrototype.mts) |
| NumberPrototype.mts | `cb5abecbfa12c857ff58dce71dc7caba1798d242` | [pinned source](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/NumberPrototype.mts) |
| StringPrototype.mts | `8ee55ce018b9c19db38a60f3c0566977e630edb8` | [pinned source](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/StringPrototype.mts) |
| ObjectPrototype.mts | `a5fa027f94f95a395ac79488667e216084a2792b` | [pinned source](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts) |

## Validation limits

No production, test, manifest, compiler pin, C++, COORDINATION or Claude files
were changed. No native experiment was justified by an observed compiler failure:
there are no probes and no new build/runtime results in this design.
W1-W19, V1-V8 and T1-T8 are proposed expected-result requirements.
The accepted 163/163 both-host and 22-static-gate baseline belongs to TS-017A
`b02cfc3`, independently reported by the coordinator; it is not a TS-018P run.

Documentation verification: `git diff --check`, scoped diff/status review, and
checks that relative Markdown links resolve. Only assigned files are to be staged.
No successor implementation or corpus research started. Await coordinator review;
task status remains in progress until acceptance.
