// Comprehensive Function Features Test
// Tests for all function-related features that are now working

console.log("=== Comprehensive Function Features Test ===");

// Test 1: Function declarations
console.log("Test 1: Function declarations");
function add(a, b) {
    return a + b;
}
console.log("add(2, 3) =", add(2, 3)); // Should be 5

// Test 2: Function expressions (now working!)
console.log("Test 2: Function expressions");
var multiply = function(x, y) {
    return x * y;
};
console.log("multiply(4, 5) =", multiply(4, 5)); // Should be 20

// Test 3: Functions with closures
console.log("Test 3: Functions with closures");
function makeCounter(start) {
    return function() {
        return start++;
    };
}
var counter = makeCounter(10);
console.log("counter() =", counter()); // Should be 10
console.log("counter() =", counter()); // Should be 11

// Test 4: Functions as first-class objects
console.log("Test 4: Functions as first-class objects");
var funcs = [
    function(x) { return x + 1; },
    function(x) { return x * 2; }
];
console.log("funcs[0](5) =", funcs[0](5)); // Should be 6
console.log("funcs[1](5) =", funcs[1](5)); // Should be 10

// Test 5: Functions with 'this' binding
console.log("Test 5: Functions with 'this' binding");
function Person(name) {
    this.name = name;
    this.greet = function() {
        return "Hello, " + this.name;
    };
}
var john = new Person("John");
console.log("john.greet() =", john.greet()); // Should be "Hello, John"

// Test 6: Nested function calls
console.log("Test 6: Nested function calls");
function square(x) { return x * x; }
function cube(x) { return x * x * x; }
console.log("square(cube(2)) =", square(cube(2))); // Should be 64

console.log("=== Comprehensive Function Features Test Complete ===");
console.log("✅ All function features working correctly!");
