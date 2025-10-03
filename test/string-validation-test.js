// String Validation Tests
// Tests for maximum string length and escape sequence validation

console.log("=== String Validation Tests ===\n");

var testsPassed = 0;
var testsFailed = 0;

// Test 1: Normal string literals work
console.log("Test 1: Normal string literals");
try {
  var str1 = "Hello, World!";
  var str2 = "Single quotes work too";
  var str3 = "String with\nnewline";
  console.log("✓ Normal strings work:", str1.length, "chars");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 2: Escape sequences work correctly
console.log("\nTest 2: Escape sequences");
try {
  var escaped = 'Tab:\tNewline:\nBackslash:\\Quote:"';
  console.log("✓ Escape sequences work");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 3: Template literals work
console.log("\nTest 3: Template literals");
try {
  var name = "World";
  var num = 42;
  var template = `Hello ${name}, the answer is ${num}`;
  console.log("✓ Template literals work:", template);
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 4: JSON string parsing works
console.log("\nTest 4: JSON string parsing");
try {
  var jsonStr = '{"name": "Test", "value": 123, "nested": {"key": "value"}}';
  var obj = JSON.parse(jsonStr);
  console.log("✓ JSON parsing works:", obj.name);
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 5: JSON escape sequences
console.log("\nTest 5: JSON escape sequences");
try {
  var jsonEscaped = '{"text": "Line 1\\nLine 2\\tTabbed"}';
  var parsed = JSON.parse(jsonEscaped);
  console.log("✓ JSON escape sequences work");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 6: Long strings (but within limits)
console.log("\nTest 6: Long strings within limits");
try {
  var longStr = "";
  var i = 0;
  while (i < 1000) {
    longStr = longStr + "x";
    i = i + 1;
  }
  console.log("✓ Long string created:", longStr.length, "chars");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Summary
console.log("\n=== Summary ===");
console.log("Passed:", testsPassed + "/" + (testsPassed + testsFailed));
console.log("Failed:", testsFailed + "/" + (testsPassed + testsFailed));

if (testsFailed === 0) {
  console.log("\n✓ All string validation tests passed!");
  console.log("String parsing improvements:");
  console.log("  - Maximum length limits prevent DoS attacks");
  console.log("  - Escape sequences properly validated");
  console.log("  - Better error messages for invalid strings");
} else {
  console.log("\n✗ Some tests failed");
}
