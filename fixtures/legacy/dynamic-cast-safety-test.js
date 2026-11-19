// Test: Dynamic Cast Safety - Type Checking
// Tests that proper TypeError exceptions are thrown when non-functions
// are passed to contexts expecting functions

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log("✓ " + message);
  } else {
    failed++;
    console.log("✗ " + message);
  }
}

function assertThrows(fn, expectedError, message) {
  try {
    fn();
    failed++;
    console.log("✗ " + message + " (no exception thrown)");
  } catch (e) {
    if (e.toString().indexOf("TypeError") !== -1) {
      passed++;
      console.log("✓ " + message);
    } else {
      failed++;
      console.log("✗ " + message + " (wrong exception: " + e + ")");
    }
  }
}

console.log("=== Dynamic Cast Safety Tests ===\n");

// Test 1: CallExpression - calling non-function
console.log("--- CallExpression Tests ---");
assertThrows(
  function () {
    let notAFunction = 42;
    notAFunction();
  },
  "TypeError",
  "Test 1: Calling a number throws TypeError"
);

assertThrows(
  function () {
    let notAFunction = "hello";
    notAFunction();
  },
  "TypeError",
  "Test 2: Calling a string throws TypeError"
);

assertThrows(
  function () {
    let obj = { value: 5 };
    obj();
  },
  "TypeError",
  "Test 3: Calling a plain object throws TypeError"
);

// Test 4: NewExpression - constructing non-function
console.log("\n--- NewExpression Tests ---");
assertThrows(
  function () {
    let notAConstructor = 42;
    new notAConstructor();
  },
  "TypeError",
  "Test 4: Using 'new' with a number throws TypeError"
);

assertThrows(
  function () {
    let notAConstructor = "test";
    new notAConstructor();
  },
  "TypeError",
  "Test 5: Using 'new' with a string throws TypeError"
);

assertThrows(
  function () {
    let obj = { prop: "value" };
    new obj();
  },
  "TypeError",
  "Test 6: Using 'new' with a plain object throws TypeError"
);

// Test 7-20: Array callback methods
console.log("\n--- Array.prototype.find ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.find(42);
  },
  "TypeError",
  "Test 7: Array.find with non-function throws TypeError"
);

console.log("\n--- Array.prototype.findIndex ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.findIndex("not a function");
  },
  "TypeError",
  "Test 8: Array.findIndex with non-function throws TypeError"
);

console.log("\n--- Array.prototype.filter ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.filter(null);
  },
  "TypeError",
  "Test 9: Array.filter with non-function throws TypeError"
);

console.log("\n--- Array.prototype.every ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.every({});
  },
  "TypeError",
  "Test 10: Array.every with non-function throws TypeError"
);

console.log("\n--- Array.prototype.some ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.some(undefined);
  },
  "TypeError",
  "Test 11: Array.some with non-function throws TypeError"
);

console.log("\n--- Array.prototype.reduce ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.reduce(123);
  },
  "TypeError",
  "Test 12: Array.reduce with non-function throws TypeError"
);

console.log("\n--- Array.prototype.reduceRight ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.reduceRight([]);
  },
  "TypeError",
  "Test 13: Array.reduceRight with non-function throws TypeError"
);

console.log("\n--- Array.prototype.forEach ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.forEach(456);
  },
  "TypeError",
  "Test 14: Array.forEach with non-function throws TypeError"
);

console.log("\n--- Array.prototype.map ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.map("mapper");
  },
  "TypeError",
  "Test 15: Array.map with non-function throws TypeError"
);

console.log("\n--- Array.prototype.flatMap ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.flatMap(true);
  },
  "TypeError",
  "Test 16: Array.flatMap with non-function throws TypeError"
);

console.log("\n--- Array.prototype.findLast ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.findLast(null);
  },
  "TypeError",
  "Test 17: Array.findLast with non-function throws TypeError"
);

console.log("\n--- Array.prototype.findLastIndex ---");
assertThrows(
  function () {
    let arr = [1, 2, 3];
    arr.findLastIndex({ not: "function" });
  },
  "TypeError",
  "Test 18: Array.findLastIndex with non-function throws TypeError"
);

// Test 19: Positive test - valid function should work
console.log("\n--- Positive Tests (should work) ---");
try {
  let arr = [1, 2, 3, 4, 5];
  let result = arr.find(function (x) {
    return x > 3;
  });
  assert(
    result === 4,
    "Test 19: Array.find with valid function works correctly"
  );
} catch (e) {
  failed++;
  console.log("✗ Test 19: Array.find with valid function (error: " + e + ")");
}

try {
  let arr = [1, 2, 3];
  let result = arr.map(function (x) {
    return x * 2;
  });
  assert(
    result.length === 3 &&
      result[0] === 2 &&
      result[1] === 4 &&
      result[2] === 6,
    "Test 20: Array.map with valid function works correctly"
  );
} catch (e) {
  failed++;
  console.log("✗ Test 20: Array.map with valid function (error: " + e + ")");
}

try {
  function MyFunction() {}
  let obj = new MyFunction();
  assert(
    typeof obj === "object",
    "Test 21: 'new' with valid constructor works correctly"
  );
} catch (e) {
  failed++;
  console.log("✗ Test 21: 'new' with valid constructor (error: " + e + ")");
}

try {
  function add(a, b) {
    return a + b;
  }
  let result = add(2, 3);
  assert(result === 5, "Test 22: Calling valid function works correctly");
} catch (e) {
  failed++;
  console.log("✗ Test 22: Calling valid function (error: " + e + ")");
}

console.log("\n=== Test Summary ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);

if (failed === 0) {
  console.log(
    "\n✓ All tests passed! Dynamic cast safety is working correctly."
  );
} else {
  console.log("\n✗ Some tests failed. Dynamic cast safety needs attention.");
}
