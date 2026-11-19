# TS-004A data descriptor validation

Implementation date: 2026-11-01. Base: `a534b05`, clean shared checkout on
`typescript-scriptc-probes`. Scope: ordinary data descriptors only. Coordinator
review is required before acceptance or starting TS-004B/C.

## Design references

- [ECMA-262 OrdinaryDefineOwnProperty and ValidateAndApplyPropertyDescriptor](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-validateandapplypropertydescriptor), consulted 2026-11-01: default missing creation fields, preserve missing update fields, reject non-configurable changes before applying anything, and compare frozen values with SameValue.
- [OrdinaryPreventExtensions](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarypreventextensions) supplies the idempotent extensibility transition.
- [SameValue](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevalue) distinguishes signed zero, equates NaN, and preserves object identity. The existing strict equality helper remains unchanged.
- [V8 js-objects.cc](https://github.com/v8/v8/blob/main/src/objects/js-objects.cc), `JSReceiver::OrdinaryDefineOwnProperty` and `JSReceiver::ValidateAndApplyPropertyDescriptor`, consulted main via raw source on 2026-11-01 (web cache; not a pinned revision). V8 uses explicit has-field checks and a should-throw policy. Rift keeps the boolean internal result separate from its strict assignment wrapper, rather than adding a throw-policy parameter to ordinary validation. No upstream code copied. V8's optimized storage and exotic/accessor paths are outside this task.

## Interfaces and assertions

See architecture-decisions.md for exact contracts. `DataDescriptorUpdate` uses
host undefined as the absent-field sentinel, distinct from tagged guest undefined.
`BooleanCompletion` carries a host boolean. The legacy complete-descriptor `define`
helper validates and treats failure as a host initialization bug. Assignment returns
the RHS or a guest TypeError. Descriptor records and inspection maps are copied;
stored flags cannot be changed by mutating an input or inspection result.

`test/object-descriptors.ts` is compiled by tsc and scriptc, with static-only build
and separately parsed full static coverage. It asserts creation defaults, empty
updates, false versus absent fields, explicit guest undefined, configurable thawing,
non-configurable writable updates/freezing, multi-field rejection atomicity,
SameValue across all supported Value kinds (including NaN, both zero directions,
and object identity), input/inspection mutation, repeated preventExtensions,
non-extensible definitions and assignment through putValue, and bootstrap rejection.
Guest fixture expectations and all prior evidence are preserved. The extra host
entry increases the aggregate lane count from 128 to 129; it is not a new guest
syntax/conformance claim. Existing tsconfig test glob already includes the entry.

## Validation

See retained command logs and structured results in this directory. Initial native
linker failures are separately retained as `*-sandbox-blocked.txt`: installed Zig
libraries were inaccessible in the sandbox. Successful reruns use the same pinned
scriptc 0.4.7, Zig PATH and mandatory coverage gates with escalated library access.
No skipped assertions, denominator reduction, or dynamic fallback is authorized.

Final results: typecheck passes; runner 20/20; probes 10/10; Node and native
129/129 each, no skips. Native static coverage: CLI 715/715, realm driver
780/780, descriptor driver 180/180. All checks use the unchanged pinned toolchain.
