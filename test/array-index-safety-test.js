// Edge case test demonstrating the safety improvements
// Tests scenarios that would cause issues with the old std::stoull approach

console.log("=== Edge Case Safety Test ===");

console.log(
  "✅ Test 1: Large Number Strings (Would cause std::stoull overflow)"
);
var obj = [];

// These would cause std::stoull to throw exceptions
obj["99999999999999999999"] = "very-large"; // Way too large
obj["18446744073709551616"] = "too-large-for-ull"; // Larger than max unsigned long long
obj["99999999999999999999999999999999999999"] = "astronomically-large"; // Ridiculously large

// Length should remain 0 since these are not valid array indices
console.log("Object length after large numbers:", obj.length);
console.log('obj["99999999999999999999"] =', obj["99999999999999999999"]);

if (obj.length === 0) {
  console.log("PASS: Large numbers correctly rejected as array indices");
} else {
  console.log("FAIL: Large numbers incorrectly accepted as array indices");
}

console.log("✅ Test 2: Malformed Number Strings");
var malformed = [];

// These would cause various parsing issues with std::stoull
malformed["123abc"] = "mixed"; // Number followed by letters
malformed["abc123"] = "letters-first"; // Letters followed by numbers
malformed["+123"] = "plus-sign"; // Plus sign (valid for std::stoll but not array index)
malformed[" 123 "] = "with-spaces"; // Leading/trailing spaces
malformed["123.0"] = "decimal-zero"; // Decimal representation of integer

console.log("Malformed array length:", malformed.length);
console.log('malformed["123abc"] =', malformed["123abc"]);
console.log('malformed["+123"] =', malformed["+123"]);

if (malformed.length === 0) {
  console.log("PASS: Malformed numbers correctly rejected");
} else {
  console.log("FAIL: Malformed numbers incorrectly accepted");
}

console.log("✅ Test 3: JavaScript Array Index Specification Compliance");
var spec = [];

// Test exact boundary: 2^32 - 2 is the maximum valid array index
spec[4294967294] = "max-valid"; // 2^32 - 2 (valid)

// These should NOT be treated as array indices per ECMAScript spec
spec[4294967295] = "exactly-2^32-minus-1"; // 2^32 - 1 (invalid per spec)
spec["4294967296"] = "2^32"; // 2^32 (invalid)

console.log("spec[4294967294] =", spec[4294967294]); // Should work
console.log('spec["4294967295"] =', spec["4294967295"]); // Should be property, not array index
console.log('spec["4294967296"] =', spec["4294967296"]); // Should be property, not array index

// Length should be 4294967295 (one more than highest valid index)
console.log("Spec compliance array length:", spec.length);

if (spec.length === 4294967295) {
  console.log(
    "PASS: ECMAScript array index specification correctly implemented"
  );
} else {
  console.log(
    "FAIL: Array index specification not correctly implemented, got length:",
    spec.length
  );
}

console.log("✅ Test 4: Leading Zeros (JavaScript specification)");
var zeros = [];

// Per JavaScript spec, properties with leading zeros are NOT array indices
zeros["0"] = "zero"; // Valid array index
zeros["00"] = "double-zero"; // Invalid - leading zero
zeros["01"] = "zero-one"; // Invalid - leading zero
zeros["007"] = "bond"; // Invalid - leading zeros

console.log("zeros[0] =", zeros[0]); // Should work
console.log('zeros["00"] =', zeros["00"]); // Property access
console.log('zeros["01"] =', zeros["01"]); // Property access

console.log("Leading zeros array length:", zeros.length);

if (zeros.length === 1) {
  console.log(
    "PASS: Leading zeros correctly handled per JavaScript specification"
  );
} else {
  console.log("FAIL: Leading zeros incorrectly handled");
}

console.log("✅ Test 5: Exception Safety");
// With the old implementation, these could cause exceptions that were masked
// With our new implementation, these are safely handled
var safe = [];

// Array of potentially problematic strings
var problematic = [
  "9223372036854775808", // Larger than max signed long long
  "18446744073709551615", // Max unsigned long long
  "18446744073709551616", // Larger than max unsigned long long
  "1" + "0".repeat(100), // Extremely long number string
  "∞", // Unicode infinity
  "NaN", // Not a number string
  "undefined", // JavaScript undefined as string
  "null", // JavaScript null as string
];

for (var i = 0; i < problematic.length; i++) {
  safe[problematic[i]] = "test-value-" + i;
}

console.log("Exception safety test completed without crashes");
console.log("Safe array length (should be 0):", safe.length);

if (safe.length === 0) {
  console.log("PASS: All problematic strings safely handled");
} else {
  console.log(
    "FAIL: Some problematic strings incorrectly treated as array indices"
  );
}

console.log("=== Edge Case Safety Test Complete ===");
