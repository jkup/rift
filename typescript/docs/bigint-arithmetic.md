# Budgeted BigInt arithmetic

Primitive operators use exact host integers after checking guest error cases.
Division/remainder by zero and negative exponents produce guest RangeErrors;
unsigned right shift produces TypeError. Signed shifts accept negative counts.
Enormous shrinking shifts return the sign extension without allocating a result
proportional to the count. Powers of zero and ±1 also take their constant-size path.

Growing shifts and powers charge an upper bound on result width before host
allocation. Other operations charge operand widths, using their product for
multiplication/division/remainder. These conservative charges use the existing
step budget and propagate its exact completion. Guest Value/operator integration
is separate; this task does not expose BigInt syntax or builtins.

Fixed arithmetic vectors and error-Realm tests pass alongside small-budget tests
for enormous exponents and shifts. A four-line compiler probe shows that callbacks
omitting their declared parameters introduce a dynamic adapter. The test uses
full signatures; initial coverage and reduced before/after probes are retained.

References: [BigInt numeric operations](https://262.ecma-international.org/16.0/#sec-numeric-types-bigint)
and [engine262 BigIntValue at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/value.mts).
