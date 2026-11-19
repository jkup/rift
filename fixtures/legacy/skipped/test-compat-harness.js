// Test our compatibility harness

// Test assert
assert(true, "This should pass");
console.log("✓ assert(true) works");

// Test assert.sameValue
assert.sameValue(42, 42, "Numbers should match");
console.log("✓ assert.sameValue works");

// Test assert.sameValue with NaN
assert.sameValue(NaN, NaN, "NaN should equal NaN");
console.log("✓ assert.sameValue with NaN works");

// Test Number.isNaN
assert.sameValue(Number.isNaN(NaN), true, "Number.isNaN(NaN) should be true");
console.log("✓ Number.isNaN test works");

// Test verifyProperty
verifyProperty(Number, "MAX_VALUE", { value: Number.MAX_VALUE });
console.log("✓ verifyProperty works");

console.log("\n✅ All compatibility harness tests passed!");
