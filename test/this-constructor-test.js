// Test constructor functions with this binding
console.log("=== Constructor Function Test ===");

// Test 1: Basic constructor
function TestConstructor(message) {
    this.message = message;
    this.type = "test";
}

console.log("Creating new TestConstructor...");
var obj = new TestConstructor("hello world");
console.log("obj:", obj);
console.log("obj.message:", obj.message);
console.log("obj.type:", obj.type);

console.log();

// Test 2: Constructor with methods
function Person(name) {
    this.name = name;
    this.greet = function() {
        return "Hello, " + this.name;
    };
}

console.log("Creating new Person...");
var john = new Person("John");
console.log("john:", john);
console.log("john.name:", john.name);
console.log("john.greet():", john.greet());

console.log();

// Test 3: Test262Error constructor
function Test262Error(message) {
    this.message = message || "";
    this.name = "Test262Error";
}

console.log("Creating new Test262Error...");
var error = new Test262Error("Something went wrong");
console.log("error:", error);
console.log("error.message:", error.message);
console.log("error.name:", error.name);

console.log();
console.log("=== Summary ===");
console.log("Basic constructor works:", obj.message === "hello world");
console.log("Person constructor works:", john.name === "John");
console.log("Test262Error constructor works:", error.message === "Something went wrong"); 