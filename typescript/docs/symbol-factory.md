# Public Symbol creation

TS-104 exposes Symbol in Script Realms as a callable whose construct operation throws before description coercion. Description conversion uses the existing string-hint ToPrimitive and primitive ToString operations before allocating a fresh GuestSymbol. Missing and undefined descriptions stay undefined; empty strings remain distinct descriptions. Allocation consumes a resource tick. Symbol.prototype remains an ordinary object without symbol data; the description accessor accepts primitive symbols or genuine boxes through thisSymbolValue, including foreign boxes and boxes with changed prototypes.

The six already implemented well-known identities are exposed as immutable Symbol properties: hasInstance, isConcatSpreadable, species, split, toPrimitive and toStringTag. Their primitive identities are shared across Realms, while functions, prototypes and errors belong to their defining Realm. Legacy bootstrap is unchanged. Symbol.for/keyFor, other well-known properties and their protocols are outside this milestone; exposing Symbol does not imply full Symbol conformance.

Builtin native-text validation now recognizes get/set prefixes followed by an otherwise valid existing property name. Empty or malformed accessor names still fail as host metadata faults. The getter has name `get description`, length zero, no setter, and a configurable, nonenumerable property.

Semantic basis: [ECMA-262 Symbol](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol-constructor) and [description](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-symbol.prototype.description), consulted 2026-11-08. [V8 Symbol builtins](https://github.com/v8/v8/blob/main/src/builtins/builtins-symbol.cc), consulted the same day, confirms description conversion and construct rejection. No V8 code is copied; Rift uses explicit completions and its existing builtin-constructor machinery.

The symbol-factory driver covers identity, coercion hooks and abrupt completion, UTF-16 descriptions, boxing, accessor metadata, well-known integration, cross-Realm errors, allocation limits and native-name validation. The fixed C++ fixture corpus remains unchanged.
