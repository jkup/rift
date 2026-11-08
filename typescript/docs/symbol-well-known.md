# Well-known symbol identities

TS-106 completes the fifteen well-known Symbol properties listed by [ECMA-262 Table 1](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-well-known-symbols), consulted 2026-11-08. The added identities are asyncDispose, asyncIterator, dispose, iterator, match, matchAll, replace, search and unscopables. Existing canonical identities remain unchanged.

Each is an immutable primitive identity shared across this runtime module's Realms, with the description Symbol.<name>. Each public property is nonwritable, nonenumerable and nonconfigurable. Ordinary and registry symbols with identical descriptions remain different identities, and Symbol.keyFor returns undefined for well-known symbols. No guest objects are shared.

This milestone implements the identity properties themselves. It does not add iterator, RegExp, async, disposal or with-statement protocol consumers. Their implementation remains separate; code may already use these symbols as ordinary property keys. Legacy Realm globals remain unchanged.

The dedicated driver checks all fifteen literal names against independently listed exported identities, every identity pair for distinctness, descriptions, cross-Realm identity, registry collisions, property flags, failed mutation/deletion, compatible redefinition and symbol/string key separation. The original symbol-wellknown.js fixture is run unchanged in the fixed C++ corpus.
