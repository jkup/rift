# Array species construction

Integrated and accepted after complete combined matcher/species validation.

`Array[Symbol.species]` is a configurable, nonenumerable getter that returns its
receiver. Array subclasses inherit it. The shared `ArraySpeciesCreate` operation
selects the constructor and invokes it through the existing construction context,
preserving `new.target`, constructor Realm, exceptions and execution budgets.
The result may be any object, including an ordinary object or a source alias.

Non-array receivers skip constructor selection. An undefined constructor or
undefined/null species uses a fresh array in the method's Realm. A foreign
intrinsic Array constructor also takes that default path without reading its
species getter; another constructor merely named Array does not. Invalid species
throws a guest TypeError. Constructor and getter exceptions propagate unchanged.

| Method | Constructor argument | Result length assignment |
| --- | --- | --- |
| map | Captured source length | None |
| filter, flat, flatMap | 0 | None |
| slice | Clamped slice length | After copying |
| concat | 0 | After copying |
| splice | Actual delete count | After copying deleted entries, before receiver mutation |

Copied elements become writable, enumerable, configurable own data properties.
Inherited setters are bypassed, and rejected property creation throws TypeError.
The explicit length assignments use ordinary throwing Set semantics, so a custom
result's setter or nonwritable length remains observable. Earlier side effects
survive a later failure. Default arrays retain their array-length limit; custom
objects are governed by the method's safe-integer bounds and execution budgets.

Existing receiver conversion, callback validation and argument coercion keep
their specified order. Holes and inherited source properties remain observable.
Legacy-profile rejection and the closed unsupported-operation codecs remain
unchanged. Array unscopables and modern Iterator/resource-management APIs are
outside this change.

The focused controls cover custom objects, subclass and bound constructors,
foreign Realms, throwing getters/constructors, protected properties, length
setters, source/result aliases and callback order. Original tests that expected
unsupported custom species are preserved in the review archive. Their successors
check the implemented behavior and retain unsupported-operation coverage through
separate RegExp Unicode-sets controls. Static coverage alone is not acceptance;
the native semantic checks must also pass.

References: ECMAScript 2025
[ArraySpeciesCreate](https://262.ecma-international.org/16.0/#sec-arrayspeciescreate),
[Array species getter](https://262.ecma-international.org/16.0/#sec-get-array-%symbol.species%),
and the algorithms for
[map](https://262.ecma-international.org/16.0/#sec-array.prototype.map),
[filter](https://262.ecma-international.org/16.0/#sec-array.prototype.filter),
[flat](https://262.ecma-international.org/16.0/#sec-array.prototype.flat),
[flatMap](https://262.ecma-international.org/16.0/#sec-array.prototype.flatmap),
[slice](https://262.ecma-international.org/16.0/#sec-array.prototype.slice),
[concat](https://262.ecma-international.org/16.0/#sec-array.prototype.concat), and
[splice](https://262.ecma-international.org/16.0/#sec-array.prototype.splice).
