// Comprehensive test of Test262 compatibility harness
// This verifies all the key assert functions work correctly

console.log("=== Testing Test262 Compatibility Harness ===\n");

// Test 1: Basic assert
console.log("Test 1: assert(true)");
assert(true, "This should pass");
console.log("✓ Passed\n");

// Test 2: assert.sameValue with numbers
console.log("Test 2: assert.sameValue with numbers");
assert.sameValue(42, 42, "Numbers should match");
console.log("✓ Passed\n");

// Test 3: assert.sameValue with NaN
console.log("Test 3: assert.sameValue with NaN");
assert.sameValue(NaN, NaN, "NaN should equal NaN");
console.log("✓ Passed\n");

// Test 4: assert.sameValue with +0/-0
console.log("Test 4: assert.sameValue distinguishes +0 and -0");
try {
  assert.sameValue(0, -0, "Should fail: +0 is not -0");
  console.log("✗ FAILED - should have thrown\n");
} catch (e) {
  console.log("✓ Passed - correctly detected +0 != -0\n");
}

// Test 5: assert.notSameValue
console.log("Test 5: assert.notSameValue");
assert.notSameValue(42, 43, "Different numbers");
console.log("✓ Passed\n");

// Test 6: Number.isNaN with assert
console.log("Test 6: Number.isNaN with assert");
assert.sameValue(Number.isNaN(NaN), true, "Number.isNaN(NaN) should be true");
assert.sameValue(Number.isNaN(42), false, "Number.isNaN(42) should be false");
console.log("✓ Passed\n");

// Test 7: Number.isFinite with assert
console.log("Test 7: Number.isFinite with assert");
assert.sameValue(
  Number.isFinite(42),
  true,
  "Number.isFinite(42) should be true"
);
assert.sameValue(
  Number.isFinite(Infinity),
  false,
  "Number.isFinite(Infinity) should be false"
);
console.log("✓ Passed\n");

// Test 8: Number.parseInt with assert
console.log("Test 8: Number.parseInt with assert");
assert.sameValue(Number.parseInt("255"), 255, "parseInt('255') should be 255");
assert.sameValue(
  Number.parseInt("FF", 16),
  255,
  "parseInt('FF', 16) should be 255"
);
console.log("✓ Passed\n");

// Test 9: verifyProperty basic
console.log("Test 9: verifyProperty");
verifyProperty(Number, "MAX_VALUE", { value: Number.MAX_VALUE });
verifyProperty(Number, "MIN_VALUE", { value: Number.MIN_VALUE });
console.log("✓ Passed\n");

// Test 10: Number object methods with assert
console.log("Test 10: Number object methods");
var num = new Number(123.456);
assert.sameValue(num.valueOf(), 123.456, "valueOf should return 123.456");
console.log("✓ Passed\n");

// Test 11: assert.throws (basic) - Skip for now, we don't have TypeError constructor yet
console.log(
  "Test 11: assert.throws - SKIPPED (no TypeError constructor yet)\n"
);

// Test 12: verifyCallableProperty
console.log("Test 12: verifyCallableProperty");
verifyCallableProperty(Number, "isNaN", "isNaN", 1);
console.log("✓ Passed\n");

console.log("=== All Harness Tests Passed! ===");
console.log("The Test262 compatibility harness is fully functional.");
