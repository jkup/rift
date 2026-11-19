# Code-point String iterators

TS-108 adds String.prototype[Symbol.iterator] and a branded String iterator. The generic factory rejects nullish receivers and uses the existing string-hint conversion once. Iteration holds the resulting immutable string, combines a leading/trailing surrogate pair, and otherwise preserves each code unit, including lone surrogates and NUL. Exhaustion releases the text. Array iteration over a boxed string continues to visit individual UTF-16 code units.

The explicit state machine needs no general generator implementation: String next invokes no guest hooks. Operation and result-allocation ticks bound repeated calls. The shared iterator-result helper retains Array allocation behavior and accepts an explicit allocation Realm for String yields. Iterator prototypes and functions remain Realm-owned; their common iterator prototype supplies the self-returning method.

## Result Realm decision

The current [String iterator algorithm](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype-%symbol.iterator%) creates its closure with [CreateIteratorFromClosure](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-createiteratorfromclosure), which captures the factory Realm. Yielded result objects are created inside that context. GeneratorStart restores the caller context before creating the final done result; later completed resumes also create results in the invoked next Realm. Rift follows that distinction explicitly: yields use the captured Realm, while done results and brand errors use next's Realm.

[V8 string-iterator.tq](https://github.com/v8/v8/blob/main/src/builtins/string-iterator.tq) instead allocates both paths through its next builtin context. This source difference was observed on 2026-11-08; it is not used to override the normative algorithms. Both directions of cross-Realm borrowing, first completion and repeated completion have explicit expected-prototype tests. This decision is local to String iteration and does not change Array iterators.

The driver also covers twelve literal UTF-16 cases, generic/coercion order, abrupt completion, captured conversion, prototype mutation/freeze, metadata, forged and mismatched brands, foreign errors, and resource bounds. Legacy String bootstrap, general generators, iterator helpers and iterable consumers are unchanged.
