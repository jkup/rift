# ZonedDateTime conversion and comparison

from, compare and equals share branded, ISO string and field-bag conversion. Branded input bypasses guest fields but validates options. Field bags read calendar first, then fields in alphabetical order with immediate coercion, then disambiguation, offset and overflow options. Strings require a timezone annotation and validate options after parsing. from allocates the defining Realm's intrinsic prototype; compare orders instants, while equals also compares canonical timezone identifiers.

The implementation supports ISO calendars and UTC/fixed offsets. All four disambiguation values are validated; fixed offsets have one possible instant. Numeric offset policies use exact arithmetic. UTC and +00:00 retain distinct identifiers for equality. No named-zone database or locale formatting is introduced.

Tests cover option/field order, abrupt completion, slot bypass, constrained and rejected fields, subminute offsets, endpoints, receiver/left-operand precedence and intrinsic allocation. Original C++ fixtures remain unchanged, including their historical calls to Temporal constructors without new.

References: [ToTemporalZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal-totemporalzoneddatetime), [ToOffsetString](https://tc39.es/proposal-temporal/#sec-temporal-tooffsetstring), from, compare and equals in the current Temporal specification. Full Node and focused static-only native checks plus parser/interpreter regressions gate integration.

The larger native entry initially exposed SC1090 at two existing constructor slot identity checks. A small union-identity reduction compiled, while the full entry reproducibly reported the two union comparisons. Explicitly narrowing the callable slot's discriminant before comparing identity preserves the invariant and restores 18,615/18,615 static statements with zero dynamic coverage. Initial reports remain in build/temporal-zoned-conversion-initial-* and the draft's initial-reviewed.json; constructor-prototype, explicit-derived and function-bind regressions are added. The typechecks are local to constructor dispatch, with no compiler version or execution-tier changes.
