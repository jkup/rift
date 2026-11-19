# TS-003 validation and design notes

Validated 2026-11-01 on Windows x64 with pinned scriptc 0.4.7 and the existing
Node/TypeScript toolchain. Base checkout: `6c79781`. Implementation is complete
and awaiting coordinator review, not milestone acceptance.

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run test:runner` | 20/20 |
| `npm run test:probes` | 10/10, static build and coverage gates |
| `npm run test:guest:node` | 128/128, no skips |
| `npm run test:guest:native` | Rebuilt, 128/128, no skips |
| Native CLI coverage | 679/679 static statements |
| Native realm/descriptor assertions | 744/744 static statements |

The text files retain command output; JSON files retain subprocess status,
stdout/stderr, fixed expectations and coverage reports. Initial sandbox attempts
failed to locate Zig's installation libraries. The `*-sandbox-failure.txt` files
retain those environment failures; successful reruns used approved access to the
installed Zig 0.17.0 directory on process PATH. No acceptance gate changed.

The interpreter and host driver are compiled; guest fixture source is read at
runtime. All 112 prior cases remain. The 16 added cases comprise the successful
Number fixture, eight readonly constants, two abrupt extra arguments, four
readonly metadata properties, and the intentionally non-callable namespace.
The existing realm case additionally checks exact constants, flags, distinct
namespaces/functions, ignored receiver values, mutable predicate state and
binding isolation. Guest expectations cover every supported value kind, missing
and excess arguments, effect order, throwing coercion hooks that must never run,
NaN/infinities/signed zero, extreme values and mutable bindings/properties.

## Design sources and scope

Consulted on 2026-11-01:

- [ECMAScript Number properties](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-properties-of-the-number-constructor),
  especially isNaN/isFinite and the eight constant clauses. The predicates test
  the value's Number kind without coercion; constants use immutable descriptors.
- [V8 number.tq](https://raw.githubusercontent.com/v8/v8/main/src/builtins/number.tq),
  main snapshot served at consultation, `NumberIsFinite` / `NumberIsNaN`
  (lines 208–246). Its type dispatch rejects non-number inputs directly. Rift
  adopts that semantic separation using the existing Value discriminant and
  host numeric predicates after narrowing, without copying V8 implementation code.

The existing `registerBuiltin` supplies callable objects and namespace property
flags. Number-local registration adds only these predicates' name/length metadata;
it does not change console or general function initialization. The module uses a
type-only Realm import and allocates every guest object during realm setup.
Host IEEE-754 constants provide the values, independently asserted against
numeric literals in the compiled host driver. No compiler workaround was needed.

This is an explicitly partial, non-callable Number namespace. Number conversion,
construction, wrappers/prototypes, formatting, integer predicates, parsing and
guest reflection APIs remain deferred. Existing parser, evaluator, own-property
and strict-call limitations remain unchanged. No follow-on task was started.
