# String search predicates

TS-114 adds Script String.prototype.includes, startsWith and endsWith. Each
method converts its receiver first, checks the search value's Symbol.match,
converts the search to a string, and finally converts/clamps the position.
Undefined endsWith positions use the string length; the other methods start at
zero. Empty searches retain the specified boundary behavior.

Only objects are inspected for Symbol.match. A defined value is tested for
truthiness without calling it. Rift has no guest RegExp brand yet: introducing
RegExp must extend the undefined-match fallback in isRegExp. Primitive searches
do not consult wrapper prototypes. Getter and coercion errors propagate unchanged;
new TypeErrors belong to the invoked builtin's Realm.

The string boundary uses host indexOf, startsWith and endsWith over UTF-16 code
units. The native probe in build/string-search-probe.ts passes twelve explicit
prefix/suffix cases on both hosts, including embedded NUL, lone surrogates and
individual halves of a pair. Its seven statements compile statically with no
dynamic operations. Guest tests independently exercise these boundaries. These
host searches do not charge a tick per code unit; builtin calls and guest
coercions retain the engine's existing resource limits.

Sources consulted 2026-11-08: [includes](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.includes),
[startsWith](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.startswith),
[endsWith](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.endswith),
[IsRegExp](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isregexp),
and V8's [includes](https://github.com/v8/v8/blob/main/src/builtins/string-includes.tq),
[startsWith](https://github.com/v8/v8/blob/main/src/builtins/string-startswith.tq)
and [endsWith](https://github.com/v8/v8/blob/main/src/builtins/string-endswith.tq).
Rift preserves their specified conversion order while keeping string storage
behind its existing boundary. No engine source was copied.

Tests cover generic receivers, metadata, default/fractional/infinite positions,
match getters and truthiness, exact conversion order and abrupt phases, UTF-16,
foreign-Realm errors, resource stops and unchanged legacy registration.
