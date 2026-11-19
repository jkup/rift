# BigInt width conversion

BigInt.asIntN and asUintN perform ToIndex before ToBigInt, even for zero bits.
ToIndex converts objects with a number hint, truncates fractions, and checks the
safe-integer range. ToBigInt accepts BigInt, booleans and valid integer strings;
unlike the BigInt factory, it rejects Number values. Both preserve abrupt guest
completions and the active builtin Realm.

Width conversion computes a positive residue modulo 2**bits, then applies the
signed boundary when requested. Already representable inputs return directly,
including enormous safe-integer widths. Allocating cases use the budgeted shift
and remainder backend before allocation. A huge negative-to-unsigned conversion
therefore exhausts the current step budget instead of allocating an enormous
integer. No host asIntN/asUintN implementation is required.

Tests cover signed boundaries, modulo wraps, 64/128-bit results, descriptors,
conversion order and abruptness, zero/huge widths, cross-Realm errors and resource
cleanup. The shared ToBigInt helper also serves the existing factory after its
explicit Number case.

References: [BigInt.asIntN/asUintN](https://262.ecma-international.org/16.0/#sec-bigint.asintn),
[ToIndex](https://262.ecma-international.org/16.0/#sec-toindex),
and [engine262 BigInt intrinsics at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/BigInt.mts).
