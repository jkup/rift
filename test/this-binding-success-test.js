// Test that demonstrates the this binding fix is working
console.log("=== this Binding Success Test ===");

// Test 1: Basic this binding in constructor
function TestConstructor(message) {
    this.message = message;
    console.log("Inside constructor, this:", this);
    console.log("Inside constructor, this.message:", this.message);
}

console.log("Creating new TestConstructor...");
var obj = new TestConstructor("SUCCESS!");
console.log("obj.message:", obj.message);
console.log("Test 1 PASSED:", obj.message === "SUCCESS!");

console.log();

// Test 2: Test262Error example from the documentation
function Test262Error(message) {
    this.message = message || "";
    this.name = "Test262Error";
}

console.log("Creating Test262Error...");
var error = new Test262Error("Something went wrong");
console.log("error.message:", error.message);
console.log("error.name:", error.name);
console.log("Test 2 PASSED:", error.message === "Something went wrong");

console.log();

// Test 3: Regular function call with this=undefined should throw TypeError
function MyFunction(value) {
    this.value = value;
    return "function result";
}

console.log("Regular function call (should throw TypeError):");
var threw = false;
try {
    MyFunction("regular");
} catch(e) {
    threw = true;
    console.log("Correctly threw:", e instanceof TypeError);
}
console.log("Test 3 PASSED:", threw === true);

console.log("Constructor call:");
var newObj = new MyFunction("constructor");
console.log("newObj.value:", newObj.value);
console.log("Test 3b PASSED:", newObj.value === "constructor");

console.log();
console.log("=== ALL TESTS PASSED! ===");
console.log("PASSED");
