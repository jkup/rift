# BigInt values and numeric semantics

BigInt is a separate Value variant backed by exact host integers. Script Realms
expose the callable, nonconstructible BigInt factory and an ordinary prototype
with valueOf, toString and @@toStringTag. Boxed values retain their own BigInt data;
the prototype itself has no such data. Legacy Realm globals remain unchanged.

ToNumeric performs number-hinted primitive conversion and preserves BigInt.
Arithmetic rejects mixed Number/BigInt operands after conversion in source order.
The budgeted arithmetic backend checks errors and charges work before allocating
large results. Updates preserve the captured reference and the old numeric value
for postfix expressions, including suspended member and super references.

Mixed comparisons compare an exact integer against the Number's truncated value,
then account for its fractional remainder; they never round the BigInt to Number.
NaN is unordered, infinities are handled separately, and strings use the validated
StringIntegerLiteral scanner. Number explicitly permits BigInt conversion while
ordinary ToNumber rejects it. Map/Set identity keeps numeric types distinct.

JSON applies toJSON and the replacer before rejecting surviving BigInt values.
Boxed BigInts are unwrapped without calling user conversion hooks. Structured
throw observations retain the primitive bigint kind and no object constructor.

Tests cover large exact values, conversion/error order, descriptors, boxing,
collections, JSON hooks, generator/async operators, cross-Realm errors and resumed
work budgets. Adding the global intentionally updates the shared literal global
inventory; the initial six inventory failures are retained in validation logs.
Literal syntax, asIntN/asUintN and locale formatting remain separate tasks.

References: [BigInt objects](https://262.ecma-international.org/16.0/#sec-bigint-objects),
[ToNumeric](https://262.ecma-international.org/16.0/#sec-tonumeric),
[IsLessThan](https://262.ecma-international.org/16.0/#sec-islessthan),
[JSON serialization](https://262.ecma-international.org/16.0/#sec-serializejsonproperty),
and [engine262 BigIntValue at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/value.mts).
