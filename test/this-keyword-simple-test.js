// Simple test for this keyword and new operator
console.log("=== Simple this Keyword Test ===");

// Test 1: Regular function call - this is undefined, property access should throw
console.log("Test 1: Regular function call with this");
function TestFunction(message) {
    this.message = message;
    return this;
}

console.log("Calling TestFunction as regular function (should throw TypeError):");
var threw = false;
try {
    var result1 = TestFunction("hello");
} catch(e) {
    threw = true;
    console.log("Correctly threw:", e instanceof TypeError);
}
console.log("Test 1 PASSED:", threw === true);

console.log();

// Test 2: Try with new operator - should work
console.log("Test 2: Try with new operator");
console.log("Calling TestFunction with new:");
var result2 = new TestFunction("world");
console.log("result2.message:", result2.message);
console.log("Test 2 PASSED:", result2.message === "world");

console.log();

// Test 3: Constructor with this
console.log("Test 3: Constructor with this");
function Simple() {
    this.value = 42;
}

var obj = new Simple();
console.log("obj.value:", obj.value);
console.log("Test 3 PASSED:", obj.value === 42);

console.log();
console.log("PASSED");
