# Numeric prefix parsing

TS-096 adds Script parseInt and parseFloat. Each global function is also the
corresponding Number property, with shared identity, ordinary builtin metadata,
and no constructor slot. The legacy namespace is unchanged.

String conversion uses the string hint. parseInt then converts its radix with
32-bit wrapping, accepts bases 2 through 36, and recognizes a hexadecimal prefix
only for an omitted/zero radix or base 16. Unsigned wrapping suffices here:
values whose signed interpretation is negative are outside the accepted range
either way. parseFloat accepts the longest decimal prefix, including Infinity;
an incomplete exponent leaves the preceding decimal prefix intact.

Both scanners explicitly recognize guest whitespace and digits, preserve signed
zero, and charge the execution budget for scanned whitespace and digits. The
host parseInt receives only validated digits and a valid radix; it supplies
binary64 rounding instead of repeated floating-point digit accumulation.
parseFloat reuses the existing strict numeric conversion for its validated
decimal span. Host conversion and substring allocation are atomic operations,
so the step budget is not a CPU or memory quota for those operations.

The runtime-input probe in build/parse-integer-probe.* passes on Node and native
with 5/5 static statements. Literal expectations cover decimal rounding beyond
the safe integer range, overflow, signed zero, binary and hexadecimal rounding,
and a long base-36 input. The semantic driver adds prefix grammar, wrapped and
invalid radices, whitespace, conversion order and abrupt completion, alias
identity, metadata, ignored extra arguments and scanning budgets.

References: ECMAScript 2023 [parseInt](https://tc39.es/ecma262/2023/multipage/global-object.html#sec-parseint-string-radix)
and [parseFloat](https://tc39.es/ecma262/2023/multipage/global-object.html#sec-parsefloat-string).
The C++ reference is src/builtins/global/global.cpp at be4618cb. Its default-radix
handling and repeated double accumulation were not adopted.
