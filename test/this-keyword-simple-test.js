// Simple test for this keyword and new operator
console.log("=== Simple this Keyword Test ===");

// Test 1: Basic function with this
console.log("Test 1: Basic function with this");
function TestFunction(message) {
    console.log("Inside TestFunction, this is:", this);
    console.log("Inside TestFunction, message is:", message);
    this.message = message;
    return this;
}

// Test calling as regular function
console.log("Calling TestFunction as regular function:");
var result1 = TestFunction("hello");
console.log("result1 is:", result1);

console.log();

// Test 2: Try with new operator
console.log("Test 2: Try with new operator");
console.log("Calling TestFunction with new:");
var result2 = new TestFunction("world");
console.log("result2 is:", result2);

console.log();

// Test 3: Even simpler
console.log("Test 3: Even simpler");
function Simple() {
    console.log("this in Simple:", this);
    this.value = 42;
}

var obj = new Simple();
console.log("obj:", obj); 