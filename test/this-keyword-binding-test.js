// Test this keyword binding in constructor functions
console.log("=== this Keyword Binding Test ===");

// Test 1: Basic constructor function with this
console.log("Test 1: Basic constructor function");
function TestConstructor(message) {
    this.message = message || "default";
    this.getValue = function() {
        return this.message;
    };
}

var obj1 = new TestConstructor("test message");
console.log("obj1.message =", obj1.message);
console.log("obj1.getValue() =", obj1.getValue());

console.log();

// Test 2: Constructor function called without new
console.log("Test 2: Constructor function called without new");
var result = TestConstructor("no new");
console.log("TestConstructor('no new') =", result);
console.log("typeof result =", typeof result);

console.log();

// Test 3: More complex constructor
console.log("Test 3: More complex constructor");
function Test262Error(message) {
    this.message = message || "";
    this.name = "Test262Error";
}

var error = new Test262Error("Something went wrong");
console.log("error.message =", error.message);
console.log("error.name =", error.name);

console.log();

// Test 4: Method calls with this
console.log("Test 4: Method calls with this");
var obj = {
    value: 42,
    getValue: function() {
        return this.value;
    }
};

console.log("obj.getValue() =", obj.getValue());

console.log();
console.log("=== Summary ===");
console.log("Constructor with this works:", obj1.message === "test message");
console.log("Error constructor works:", error.message === "Something went wrong"); 