# Trailing object and argument commas

TS-132 admits trailing commas in Script object literals and call/constructor argument lists, including methods, accessors and spread arguments. The parser consumes the separator and stops at the closing delimiter without appending an element. Existing evaluation order, argument counts, descriptors and source spans are unchanged.

The change follows the optional final comma in the [Object Initializer](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-object-initializer) and [Argument Lists](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-argument-lists) grammar. Leading and repeated commas still fail. Legacy parsing and function parameter lists retain their prior boundaries; array trailing commas/elisions were already supported.

Focused tests cover nested objects, methods/accessors, function name/source preservation, empty/nonempty spreads, Array constructor argument counts, evaluation order, abrupt completion, comments and malformed lists. Historical spread-argument rejection sources remain with positive execution expectations. Full acceptance is pending.
