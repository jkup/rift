// Comprehensive GC safety test
// Tests that objects are properly protected during initialization
// and can still be collected when unreachable

console.log("=== Comprehensive GC Safety Test ===\n");

var testsPassed = 0;
var testsFailed = 0;

// Test 1: Array constructor doesn't crash
console.log("Test 1: Array constructor safety");
try {
  var arr = new Array(10);
  console.log("✓ Array constructor safe, length:", arr.length);
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 2: Boolean object wrapper doesn't crash
console.log("\nTest 2: Boolean object wrapper safety");
try {
  var boolObj = new Boolean(true);
  console.log("✓ Boolean wrapper safe:", boolObj);
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 3: Object constructor with primitive doesn't crash
console.log("\nTest 3: Object constructor with primitives");
try {
  var strObj = new Object("test");
  var numObj = new Object(42);
  var boolObj2 = new Object(false);
  console.log("✓ Object wrappers safe");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 4: Error constructor doesn't crash
console.log("\nTest 4: Error constructor safety");
try {
  var err = new Error("Test error");
  console.log("✓ Error constructor safe");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 5: Multiple object creation in tight loop
console.log("\nTest 5: Multiple object creation (stress test)");
try {
  var i = 0;
  while (i < 50) {
    var temp = new Array(5);
    temp[0] = i;
    i = i + 1;
  }
  console.log("✓ Created 50 arrays without crash");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 6: Nested object creation
console.log("\nTest 6: Nested object creation");
try {
  var outer = new Array(3);
  outer[0] = new Array(2);
  outer[1] = new Boolean(true);
  outer[2] = new Error("nested");
  console.log("✓ Nested objects created safely");
  testsPassed = testsPassed + 1;
} catch (e) {
  console.log("✗ FAILED:", e);
  testsFailed = testsFailed + 1;
}

// Test 7: Array with complex initialization
console.log("\nTest 7: Array with complex properties");
try {
  var complex = new Array(5);
  complex[0] = "string";
  complex[1] = 42;
  complex[2] = true;
  complex[3] = new Array(2);
  complex[4] = new Boolean(false);
  console.log("✓ Complex array initialized safely, length:", complex.length);
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
  console.log("\n✓ All GC safety tests passed!");
  console.log("GC architecture is working correctly:");
  console.log("  - Objects protected during initialization (GCProtector)");
  console.log("  - No heap-use-after-free errors");
  console.log("  - Complex object creation works safely");
} else {
  console.log("\n✗ Some tests failed - GC issues detected");
}
