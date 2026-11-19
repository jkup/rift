# String split

TS-092 adds Script String.split and the internal well-known split identity.
Nullish receivers fail before protocol lookup. For other receivers, a custom
separator hook is retrieved and called before any receiver or limit conversion,
with the separator as this and the original receiver and limit arguments. Its
result is returned unchanged. Null/undefined hooks fall back; other noncallables
throw in the builtin Realm. Primitive separators use ordinary boxed lookup with
the primitive receiver retained for getters.

The fallback converts receiver, limit and separator in that order, even when the
limit becomes zero. Limits use ToUint32. Missing separators produce one string;
empty separators produce UTF-16 units. Other separators use nonoverlapping forward
searches, preserving empty leading/trailing segments. Results are dense ordinary
arrays in the builtin Realm, with own data properties bypassing inherited setters.
No species is consulted.

Each result append consumes a step; host primitive search/slicing is atomic as in
indexOf. This bounds result loops, not the CPU time of a single host string search.
RegExp construction/matching and public Symbol installation remain separate work.

References: [String.prototype.split](https://tc39.es/ecma262/2023/multipage/text-processing.html#sec-string.prototype.split)
and src/builtins/string/string.cpp at base 8f54e950. The guest semantic path stays
explicit rather than using host regular expressions or guest execution.
The dedicated driver checks protocol priority, primitive getters, arbitrary hook
results, Realm ownership, coercion order, errors, limits, UTF-16 and bounded output.
