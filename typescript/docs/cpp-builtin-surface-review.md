# C++ builtin surface review

Reviewed 2026-11-11 against integrated TypeScript commit `5bf587cb`, after the
private-method and Reflect successors. Their combined native acceptance is pending.

The audit extracts all 525 `RIFT_METHOD`, `RIFT_STATIC_METHOD` and `RIFT_GETTER`
registrations under the C++ builtin directory, including 35 unqualified Math
registrations. It rejects unmatched macro declarations. A generated Script reads
own property descriptors in Node-hosted Rift without invoking prototype getters.
An independent Node v26.13.0 subprocess executes the same inspection.

| Classification | Registrations |
| --- | ---: |
| Same own-property shape and method arity | 501 |
| Different C++ surface; TypeScript agrees with Node | 14 |
| Absent weak-storage APIs with existing compiler blockers | 10 |

These counts are an API-shape inventory, not semantic coverage or a parity
percentage. They exclude constructors, constants, symbol keys and registrations
that do not use these three macros. In particular, FinalizationRegistry's manual
register/unregister declarations remain blocked too; JSON and global registration
need separate inspection. This audit adds no native execution claim.

The fourteen deliberate differences are:

- Seven Error subclasses inherit `toString` instead of defining their own method.
  This follows the [NativeError prototype contract](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-properties-of-the-nativeerror-prototype-objects)
  and AggregateError inheritance; Node confirms both lookup and own-property shape.
- Symbol.prototype.description and Temporal.ZonedDateTime.prototype.hoursInDay
  are accessors. C++ registers methods; its Symbol source explicitly documents
  that deviation. See [Symbol description](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol.prototype.description)
  and [Temporal hoursInDay](https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.hoursinday).
- PlainDateTime and ZonedDateTime omit direct toPlainYearMonth/toPlainMonthDay,
  and PlainTime omits toPlainDateTime. The current [Temporal specification](https://tc39.es/proposal-temporal/)
  and Node agree. Date-derived conversions compose through toPlainDate;
  [the Temporal documentation](https://tc39.es/proposal-temporal/docs/plaindatetime.html)
  shows that route. Do not add old C++ convenience methods to inflate parity.

The ten blocked macro registrations are WeakMap's six methods, WeakSet's three
and WeakRef.deref. Their missing globals remain governed by the measured
[static-compiler prerequisites](native-host-prerequisites.md), not by missing
ordinary-map wrappers.

The C++ iterator implementation supplies only the shared iterator prototype;
this review found no Iterator helper constructor to port. C++ has an isProxy hook
but no Proxy constructor implementation in the inspected source. Its RegExp
implementation documents RE2's lack of backreferences and lookarounds; TypeScript
already goes beyond that scope. Do not mistake hooks or spec comments for
implemented C++ features.

Evidence: `build/extract-cpp-builtin-surface.mjs`,
`build/review-cpp-builtin-surface.mjs`, `build/classify-cpp-builtin-surface.mjs`,
the generated guest source, exact transcripts and
`build/cpp-builtin-surface-reviewed.json`. The initial qualified-only 490-row
inventory is retained separately. Continue with combined acceptance and targeted
semantic testing; this review found no new ordinary method name to add.
