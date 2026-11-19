// Simplified test for dynamic cast safety - Type Checking
// Tests that proper TypeError exceptions are thrown when non-functions
// are passed to contexts expecting functions

console.log("=== Dynamic Cast Safety Tests (Simplified) ===\n");

let passed = 0;
let failed = 0;

// Test 1: CallExpression - calling non-function
console.log("Test 1: Calling a number");
try {
  let notAFunction = 42;
  notAFunction();
  console.log("✗ FAILED - No exception thrown");
  failed++;
} catch (e) {
  if (e.toString().indexOf("TypeError") !== -1) {
    console.log("✓ PASSED - TypeError thrown correctly");
    passed++;
  } else {
    console.log("✗ FAILED - Wrong exception: " + e);
    failed++;
  }
}

// Test 2: NewExpression - constructing with non-function
console.log("\nTest 2: Using 'new' with a string");
try {
  let notAConstructor = "test";
  new notAConstructor();
  console.log("✗ FAILED - No exception thrown");
  failed++;
} catch (e) {
  if (e.toString().indexOf("TypeError") !== -1) {
    console.log("✓ PASSED - TypeError thrown correctly");
    passed++;
  } else {
    console.log("✗ FAILED - Wrong exception: " + e);
    failed++;
  }
}

// Test 3: Positive test - valid function should work
console.log("\nTest 3: Calling a valid function");
try {
  function add(a, b) {
    return a + b;
  }
  let result = add(2, 3);
  if (result === 5) {
    console.log("✓ PASSED - Valid function works");
    passed++;
  } else {
    console.log("✗ FAILED - Wrong result: " + result);
    failed++;
  }
} catch (e) {
  console.log("✗ FAILED - Exception thrown: " + e);
  failed++;
}

// Test 4: Valid constructor
console.log("\nTest 4: Using 'new' with valid constructor");
try {
  function MyConstructor() {
    this.value = 42;
  }
  let obj = new MyConstructor();
  if (typeof obj === "object") {
    console.log("✓ PASSED - Valid constructor works");
    passed++;
  } else {
    console.log("✗ FAILED - Wrong type: " + typeof obj);
    failed++;
  }
} catch (e) {
  console.log("✗ FAILED - Exception thrown: " + e);
  failed++;
}

console.log("\n=== Summary ===");
console.log("Passed: " + passed + "/4");
console.log("Failed: " + failed + "/4");

if (failed === 0) {
  console.log("\n✓ All core dynamic cast tests passed!");
} else {
  console.log("\n✗ Some tests failed");
}
