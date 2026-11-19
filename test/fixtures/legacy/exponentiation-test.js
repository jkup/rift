// Exponentiation Operator Test
// Tests for ** and **= operators

console.log("=== Exponentiation Operator Test ===");

// Test 1: Basic exponentiation
console.log("Test 1: Basic Exponentiation");
if (2 ** 3 === 8) console.log("PASS: 2 ** 3 = 8");
if (2 ** 3 !== 8) console.log("FAIL: 2 ** 3 expected 8");

// Test 2: Powers of 2
console.log("Test 2: Powers of 2");
if (2 ** 0 === 1) console.log("PASS: 2 ** 0 = 1");
if (2 ** 0 !== 1) console.log("FAIL: 2 ** 0 expected 1");
if (2 ** 10 === 1024) console.log("PASS: 2 ** 10 = 1024");
if (2 ** 10 !== 1024) console.log("FAIL: 2 ** 10 expected 1024");

// Test 3: Fractional exponents (square root)
console.log("Test 3: Fractional Exponents");
if (9 ** 0.5 === 3) console.log("PASS: 9 ** 0.5 = 3 (square root)");
if (9 ** 0.5 !== 3) console.log("FAIL: 9 ** 0.5 expected 3");

// Test 4: Negative exponents
console.log("Test 4: Negative Exponents");
if (2 ** -1 === 0.5) console.log("PASS: 2 ** -1 = 0.5");
if (2 ** -1 !== 0.5) console.log("FAIL: 2 ** -1 expected 0.5");

// Test 5: Right associativity
console.log("Test 5: Right Associativity");
// 2 ** 3 ** 2 should be 2 ** (3 ** 2) = 2 ** 9 = 512, NOT (2 ** 3) ** 2 = 8 ** 2 = 64
if (2 ** 3 ** 2 === 512) console.log("PASS: 2 ** 3 ** 2 = 512 (right-associative)");
if (2 ** 3 ** 2 !== 512) console.log("FAIL: 2 ** 3 ** 2 expected 512, got " + (2 ** 3 ** 2));

// Test 6: Precedence with multiplication
console.log("Test 6: Precedence with Multiplication");
// 2 * 3 ** 2 should be 2 * (3 ** 2) = 2 * 9 = 18, NOT (2 * 3) ** 2 = 36
if (2 * 3 ** 2 === 18) console.log("PASS: 2 * 3 ** 2 = 18 (** higher precedence)");
if (2 * 3 ** 2 !== 18) console.log("FAIL: 2 * 3 ** 2 expected 18, got " + (2 * 3 ** 2));

// Test 7: Compound assignment **=
console.log("Test 7: Compound Assignment (**=)");
var x = 2;
x **= 4;
if (x === 16) console.log("PASS: x = 2; x **= 4; x = 16");
if (x !== 16) console.log("FAIL: x **= 4 expected 16, got " + x);

// Test 8: Object property **=
console.log("Test 8: Object Property **=");
var obj = { base: 3 };
obj.base **= 3;
if (obj.base === 27) console.log("PASS: obj.base **= 3 = 27");
if (obj.base !== 27) console.log("FAIL: obj.base **= 3 expected 27, got " + obj.base);

// Test 9: Zero and one edge cases
console.log("Test 9: Edge Cases");
if (0 ** 0 === 1) console.log("PASS: 0 ** 0 = 1 (mathematical convention)");
if (0 ** 0 !== 1) console.log("FAIL: 0 ** 0 expected 1");
if (1 ** 1000 === 1) console.log("PASS: 1 ** 1000 = 1");
if (1 ** 1000 !== 1) console.log("FAIL: 1 ** 1000 expected 1");

// Test 10: Negative base
console.log("Test 10: Negative Base");
var result = (-2) ** 3;
if (result === -8) console.log("PASS: (-2) ** 3 = -8");
if (result !== -8) console.log("FAIL: (-2) ** 3 expected -8, got " + result);

console.log("=== Exponentiation Operator Test Complete ===");
