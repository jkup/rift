# String well-formedness

TS-135 adds Script String.prototype.isWellFormed and toWellFormed. Both first perform the existing generic string-receiver conversion. A shared UTF-16 scan preserves valid high/low surrogate pairs; the predicate returns false at the first unpaired surrogate, while conversion replaces each unpaired unit with U+FFFD.

Each scan iteration charges the execution budget. Conversion retains unchanged spans and joins once; already well-formed text returns directly. The methods ignore arguments, have length zero, remain nonconstructable, and allocate errors in their defining Realm. Legacy bootstrap is unchanged.

References consulted 2026-11-09: ECMAScript [isWellFormed](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.iswellformed) and [toWellFormed](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.towellformed), plus V8's [isWellFormed](https://github.com/v8/v8/blob/main/src/builtins/string-iswellformed.tq) and [toWellFormed](https://github.com/v8/v8/blob/main/src/builtins/string-towellformed.tq) implementations. Rift retains the same pairing/replacement semantics with a bounded direct scan; it does not adopt V8-specific string representations or flattening paths.

Focused tests cover surrogate boundaries and arrangements, unchanged BMP/astral text, repair invariants, generic receivers, coercion hints/order/faults, descriptors, captured Realm errors, ignored arguments, bounded scanning and early predicate exit. Full acceptance is pending.
