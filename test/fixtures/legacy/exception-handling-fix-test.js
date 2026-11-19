// Test to verify improved exception handling
// This file demonstrates that the exception handling fixes work correctly

// Test 1: typeof with undefined variables (previously used catch-all)
console.log("Test 1 - typeof undefined variable:");
console.log("typeof undefinedVar:", typeof undefinedVar);
console.log(
  "Expected: undefined, Got:",
  typeof undefinedVar === "undefined" ? "✓ PASS" : "✗ FAIL"
);

// Test 2: parseFloat with invalid strings (previously used catch-all)
console.log("\nTest 2 - parseFloat with invalid input:");
var result1 = parseFloat("not a number");
console.log("parseFloat('not a number'):", result1);
console.log("Expected: NaN, Got:", isNaN(result1) ? "✓ PASS" : "✗ FAIL");

// Test 3: parseFloat with valid numbers
console.log("\nTest 3 - parseFloat with valid input:");
var result2 = parseFloat("123.45");
console.log("parseFloat('123.45'):", result2);
console.log("Expected: 123.45, Got:", result2 === 123.45 ? "✓ PASS" : "✗ FAIL");

// Test 4: parseInt with valid numbers
console.log("\nTest 4 - parseInt:");
var result3 = parseInt("42", 10);
console.log("parseInt('42', 10):", result3);
console.log("Expected: 42, Got:", result3 === 42 ? "✓ PASS" : "✗ FAIL");

// Test 5: String to number conversion (internally uses stod with catch)
console.log("\nTest 5 - String to number coercion:");
var str = "999";
var num = str * 1; // Forces conversion
console.log("'999' * 1:", num);
console.log("Expected: 999, Got:", num === 999 ? "✓ PASS" : "✗ FAIL");

// Test 6: Invalid string to number conversion
console.log("\nTest 6 - Invalid string to number:");
var invalid = "abc" * 1;
console.log("'abc' * 1:", invalid);
console.log("Expected: NaN, Got:", isNaN(invalid) ? "✓ PASS" : "✗ FAIL");

console.log("\n--- All exception handling tests completed ---");
