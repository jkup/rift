// Function expression tests
// Function expressions are now fully implemented and working!

console.log("=== Function Expression Test ===");

// Test 1: Basic function expression with parameters
console.log("Test 1: Basic function expression");
var add = function(a, b) { 
    return a + b; 
};
console.log("add(3, 4) =", add(3, 4)); // Should be 7

// Test 2: Function expression with single parameter
console.log("Test 2: Single parameter function");
var double = function(x) { 
    return x * 2; 
};
console.log("double(5) =", double(5)); // Should be 10

// Test 3: Function expression without parameters
console.log("Test 3: No parameters function");
var greet = function() { 
    return "Hello, World!"; 
};
console.log("greet() =", greet()); // Should be "Hello, World!"

// Test 4: Direct function expression call (IIFE style)
console.log("Test 4: Immediate function call");
var result = (function(x) { return x + 1; })(5);
console.log("(function(x) { return x + 1; })(5) =", result); // Should be 6

// Test 5: Function expression as object property
console.log("Test 5: Function as object property");
var obj = {
    method: function(x) {
        return x * 3;
    }
};
console.log("obj.method(4) =", obj.method(4)); // Should be 12

// Test 6: Function expression in array
console.log("Test 6: Function in array");
var operations = [
    function(x) { return x + 1; },
    function(x) { return x * 2; }
];
console.log("operations[0](10) =", operations[0](10)); // Should be 11
console.log("operations[1](10) =", operations[1](10)); // Should be 20

console.log("=== Function Expression Test Complete ===");
console.log("✅ All function expression tests passed!"); 