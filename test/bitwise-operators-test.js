// Bitwise Operators Test
// Tests for &, |, ^, <<, >>, >>>, and compound assignments

console.log("=== Bitwise Operators Test ===");

// Test 1: Bitwise AND (&)
console.log("Test 1: Bitwise AND (&)");
if ((5 & 3) === 1) console.log("PASS: 5 & 3 = 1 (0101 & 0011 = 0001)");
if ((5 & 3) !== 1) console.log("FAIL: 5 & 3 expected 1, got " + (5 & 3));
if ((15 & 9) === 9) console.log("PASS: 15 & 9 = 9 (1111 & 1001 = 1001)");
if ((15 & 9) !== 9) console.log("FAIL: 15 & 9 expected 9, got " + (15 & 9));
if ((0 & 255) === 0) console.log("PASS: 0 & 255 = 0");
if ((0 & 255) !== 0) console.log("FAIL: 0 & 255 expected 0");

// Test 2: Bitwise OR (|)
console.log("Test 2: Bitwise OR (|)");
if ((5 | 3) === 7) console.log("PASS: 5 | 3 = 7 (0101 | 0011 = 0111)");
if ((5 | 3) !== 7) console.log("FAIL: 5 | 3 expected 7, got " + (5 | 3));
if ((12 | 10) === 14) console.log("PASS: 12 | 10 = 14 (1100 | 1010 = 1110)");
if ((12 | 10) !== 14) console.log("FAIL: 12 | 10 expected 14, got " + (12 | 10));
if ((0 | 0) === 0) console.log("PASS: 0 | 0 = 0");
if ((0 | 0) !== 0) console.log("FAIL: 0 | 0 expected 0");

// Test 3: Bitwise XOR (^)
console.log("Test 3: Bitwise XOR (^)");
if ((5 ^ 3) === 6) console.log("PASS: 5 ^ 3 = 6 (0101 ^ 0011 = 0110)");
if ((5 ^ 3) !== 6) console.log("FAIL: 5 ^ 3 expected 6, got " + (5 ^ 3));
if ((15 ^ 15) === 0) console.log("PASS: 15 ^ 15 = 0 (XOR with self = 0)");
if ((15 ^ 15) !== 0) console.log("FAIL: 15 ^ 15 expected 0");
if ((0 ^ 42) === 42) console.log("PASS: 0 ^ 42 = 42 (XOR with 0 = identity)");
if ((0 ^ 42) !== 42) console.log("FAIL: 0 ^ 42 expected 42");

// Test 4: Left Shift (<<)
console.log("Test 4: Left Shift (<<)");
if ((1 << 0) === 1) console.log("PASS: 1 << 0 = 1");
if ((1 << 0) !== 1) console.log("FAIL: 1 << 0 expected 1");
if ((1 << 1) === 2) console.log("PASS: 1 << 1 = 2");
if ((1 << 1) !== 2) console.log("FAIL: 1 << 1 expected 2");
if ((1 << 4) === 16) console.log("PASS: 1 << 4 = 16");
if ((1 << 4) !== 16) console.log("FAIL: 1 << 4 expected 16");
if ((5 << 2) === 20) console.log("PASS: 5 << 2 = 20");
if ((5 << 2) !== 20) console.log("FAIL: 5 << 2 expected 20");

// Test 5: Signed Right Shift (>>)
console.log("Test 5: Signed Right Shift (>>)");
if ((16 >> 2) === 4) console.log("PASS: 16 >> 2 = 4");
if ((16 >> 2) !== 4) console.log("FAIL: 16 >> 2 expected 4");
if ((100 >> 3) === 12) console.log("PASS: 100 >> 3 = 12");
if ((100 >> 3) !== 12) console.log("FAIL: 100 >> 3 expected 12");
if ((-8 >> 2) === -2) console.log("PASS: -8 >> 2 = -2 (sign-extended)");
if ((-8 >> 2) !== -2) console.log("FAIL: -8 >> 2 expected -2, got " + (-8 >> 2));

// Test 6: Unsigned Right Shift (>>>)
console.log("Test 6: Unsigned Right Shift (>>>)");
if ((16 >>> 2) === 4) console.log("PASS: 16 >>> 2 = 4");
if ((16 >>> 2) !== 4) console.log("FAIL: 16 >>> 2 expected 4");
// -1 >>> 0 should give max unsigned 32-bit value (4294967295)
var unsignedMax = -1 >>> 0;
if (unsignedMax === 4294967295) console.log("PASS: -1 >>> 0 = 4294967295");
if (unsignedMax !== 4294967295) console.log("FAIL: -1 >>> 0 expected 4294967295, got " + unsignedMax);
// -8 >>> 2 should be positive (treats as unsigned)
var unsignedResult = -8 >>> 2;
if (unsignedResult === 1073741822) console.log("PASS: -8 >>> 2 = 1073741822");
if (unsignedResult !== 1073741822) console.log("FAIL: -8 >>> 2 expected 1073741822, got " + unsignedResult);

// Test 7: Bitwise NOT (~) - already existed but test for completeness
console.log("Test 7: Bitwise NOT (~)");
if (~0 === -1) console.log("PASS: ~0 = -1");
if (~0 !== -1) console.log("FAIL: ~0 expected -1");
if (~1 === -2) console.log("PASS: ~1 = -2");
if (~1 !== -2) console.log("FAIL: ~1 expected -2");
if (~-1 === 0) console.log("PASS: ~-1 = 0");
if (~-1 !== 0) console.log("FAIL: ~-1 expected 0");

// Test 8: Compound assignment &=
console.log("Test 8: Compound Assignment (&=)");
var a = 15;
a &= 9;
if (a === 9) console.log("PASS: 15 &= 9 gives 9");
if (a !== 9) console.log("FAIL: 15 &= 9 expected 9, got " + a);

// Test 9: Compound assignment |=
console.log("Test 9: Compound Assignment (|=)");
var b = 5;
b |= 3;
if (b === 7) console.log("PASS: 5 |= 3 gives 7");
if (b !== 7) console.log("FAIL: 5 |= 3 expected 7, got " + b);

// Test 10: Compound assignment ^=
console.log("Test 10: Compound Assignment (^=)");
var c = 12;
c ^= 10;
if (c === 6) console.log("PASS: 12 ^= 10 gives 6");
if (c !== 6) console.log("FAIL: 12 ^= 10 expected 6, got " + c);

// Test 11: Compound assignment <<=
console.log("Test 11: Compound Assignment (<<=)");
var d = 3;
d <<= 4;
if (d === 48) console.log("PASS: 3 <<= 4 gives 48");
if (d !== 48) console.log("FAIL: 3 <<= 4 expected 48, got " + d);

// Test 12: Compound assignment >>=
console.log("Test 12: Compound Assignment (>>=)");
var e = 64;
e >>= 3;
if (e === 8) console.log("PASS: 64 >>= 3 gives 8");
if (e !== 8) console.log("FAIL: 64 >>= 3 expected 8, got " + e);

// Test 13: Compound assignment >>>=
console.log("Test 13: Compound Assignment (>>>=)");
var f = -16;
f >>>= 2;
if (f === 1073741820) console.log("PASS: -16 >>>= 2 gives 1073741820");
if (f !== 1073741820) console.log("FAIL: -16 >>>= 2 expected 1073741820, got " + f);

// Test 14: Object property bitwise assignment
console.log("Test 14: Object Property Bitwise Assignment");
var obj = { flags: 5 };
obj.flags |= 8;
if (obj.flags === 13) console.log("PASS: obj.flags |= 8 gives 13");
if (obj.flags !== 13) console.log("FAIL: obj.flags |= 8 expected 13, got " + obj.flags);
obj.flags &= 12;
if (obj.flags === 12) console.log("PASS: obj.flags &= 12 gives 12");
if (obj.flags !== 12) console.log("FAIL: obj.flags &= 12 expected 12, got " + obj.flags);

// Test 15: Precedence test - bitwise AND has higher precedence than OR
console.log("Test 15: Precedence");
// 2 | 4 & 6 should be 2 | (4 & 6) = 2 | 4 = 6
if ((2 | 4 & 6) === 6) console.log("PASS: 2 | 4 & 6 = 6 (& higher precedence than |)");
if ((2 | 4 & 6) !== 6) console.log("FAIL: 2 | 4 & 6 expected 6, got " + (2 | 4 & 6));
// XOR is between AND and OR
// 1 | 2 ^ 3 & 1 should be 1 | (2 ^ (3 & 1)) = 1 | (2 ^ 1) = 1 | 3 = 3
if ((1 | 2 ^ 3 & 1) === 3) console.log("PASS: 1 | 2 ^ 3 & 1 = 3 (precedence: & > ^ > |)");
if ((1 | 2 ^ 3 & 1) !== 3) console.log("FAIL: 1 | 2 ^ 3 & 1 expected 3, got " + (1 | 2 ^ 3 & 1));

// Test 16: Shift has higher precedence than comparison
console.log("Test 16: Shift Precedence");
// 1 << 2 < 8 should be (1 << 2) < 8 = 4 < 8 = true
if ((1 << 2 < 8) === true) console.log("PASS: 1 << 2 < 8 is true (shift higher than comparison)");
if ((1 << 2 < 8) !== true) console.log("FAIL: 1 << 2 < 8 expected true");

// Test 17: Practical example - setting/clearing bits
console.log("Test 17: Practical Bit Manipulation");
var flags = 0;
// Set bit 0
flags |= 1;
if (flags === 1) console.log("PASS: Set bit 0, flags = 1");
if (flags !== 1) console.log("FAIL: expected 1, got " + flags);
// Set bit 2
flags |= 4;
if (flags === 5) console.log("PASS: Set bit 2, flags = 5");
if (flags !== 5) console.log("FAIL: expected 5, got " + flags);
// Clear bit 0
flags &= ~1;
if (flags === 4) console.log("PASS: Clear bit 0, flags = 4");
if (flags !== 4) console.log("FAIL: expected 4, got " + flags);
// Toggle bit 2
flags ^= 4;
if (flags === 0) console.log("PASS: Toggle bit 2, flags = 0");
if (flags !== 0) console.log("FAIL: expected 0, got " + flags);

// Test 18: Powers of 2 using shift
console.log("Test 18: Powers of 2 with Shift");
if ((1 << 0) === 1) console.log("PASS: 2^0 = 1");
if ((1 << 0) !== 1) console.log("FAIL: 2^0 expected 1");
if ((1 << 10) === 1024) console.log("PASS: 2^10 = 1024");
if ((1 << 10) !== 1024) console.log("FAIL: 2^10 expected 1024");

console.log("=== Bitwise Operators Test Complete ===");
