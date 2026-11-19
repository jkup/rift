# RegExp split

RegExp Symbol.split uses species construction to create a separate sticky splitter. Input conversion precedes constructor/species lookup and flags conversion; construction precedes limit conversion, even for a zero limit. The default constructor belongs to the method's Realm and does not consult the mutable global.

The scan preserves observable lastIndex writes, overridden exec calls and capture reads. Captures retain their original values, including undefined. Limits stop before later capture getters. Empty input executes once; zero-width matches advance through UTF-16 code units, or surrogate pairs for generic u/v flags. Actual Unicode patterns remain outside the admitted pattern language.

Fresh result arrays belong to the method's Realm. Iterations and capture insertion consume the operation budget, including custom splitters that fail to progress. String.split already dispatches through Symbol.split and needs no additional implementation.

Semantics follow [ECMAScript 2025](https://262.ecma-international.org/16.0/#sec-regexp.prototype-%symbol.split%), reviewed against [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExpPrototype.mts). The older engine revision checks u alone; the implementation follows the specification's u-or-v advancement.

Focused tests cover species and coercion ordering, abrupt completions, limits, zero-width matches, capture identity, cross-Realm allocation and budgets. The isolated draft passes 676 Node guests and focused execution on both hosts at 11015 static statements, zero dynamic. Full canonical validation follows integration.
