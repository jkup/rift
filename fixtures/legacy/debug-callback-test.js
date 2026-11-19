// Debug test for callback function parameters

console.log("=== Debug Callback Test ===");

// Test simple function first
function testFunc(a, b) {
    console.log("testFunc called with:", a, b);
    return a + b;
}

var result = testFunc(1, 2);
console.log("testFunc result:", result);

// Test function expression creation
console.log("Testing function expression creation:");
var testFunc2 = function(x) {
    console.log("testFunc2 called with:", x);
    return x * 2;
};

console.log("Function expression created successfully");

// Test calling the function expression without parameters
console.log("Testing function expression call without parameters:");
var result2 = testFunc2();
console.log("testFunc2() result:", result2);

// Test calling the function expression with parameters
console.log("Testing function expression call with parameters:");
var result3 = testFunc2(5);
console.log("testFunc2(5) result:", result3);

// Test forEach with simpler callback
console.log("Testing forEach with simple callback:");
var arr = [1, 2, 3];

// Try with a callback that doesn't use parameters first
arr.forEach(function() {
    console.log("forEach callback called (no parameters)");
});

console.log("=== Debug Test Complete ==="); 