# String concatenation and reverse search

TS-090 adds Script String.concat and lastIndexOf. Receiver conversion precedes
argument conversion. concat converts arguments individually with the string hint,
stopping at the first throw, then joins the saved strings once. Each argument
consumes the step budget. lastIndexOf converts the search before the position;
NaN positions become Infinity before integer conversion. Missing search arguments
convert to "undefined". Generic receivers and symbol conversion errors use the
existing completion machinery and builtin Realm.

The string boundary delegates primitive UTF-16 reverse searching and joining to
the host representation. A reduced four-statement probe compiles entirely
statically and returns the same explicit results on both hosts, including a
supplementary character: build/string-lastindex-probe.*. As with indexOf, a single
host search is atomic with respect to guest step accounting; this is not a CPU
or string-allocation quota.

References: [concat](https://tc39.es/ecma262/2023/multipage/text-processing.html#sec-string.prototype.concat)
and [lastIndexOf](https://tc39.es/ecma262/2023/multipage/text-processing.html#sec-string.prototype.lastindexof).
The C++ reference at src/builtins/string/string.cpp, base 4b2a4b26, returns -1 for
an omitted search and uses byte-oriented storage. Those shortcuts are not retained.
Tests cover lone surrogates, UTF-16 indices, empty/overlapping searches, NaN and
infinite/fractional positions, null and symbols, ordered conversion failures,
argument loops and the existing metadata checks.
