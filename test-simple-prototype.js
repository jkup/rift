// Simple prototype chain test without constructor

console.log("=== Simple Prototype Test ===");

// Test 1: Array literal should have prototype methods
var arr = [1, 2, 3];
console.log("Array created:", arr);

// Test 2: toString should work via prototype
console.log("toString():", arr.toString());

// Test 3: push should work via prototype
arr.push(4);
console.log("After push(4):", arr.toString());

// Test 4: pop should work via prototype  
var popped = arr.pop();
console.log("Popped element:", popped);
console.log("After pop:", arr.toString());

console.log("=== Test Complete ==="); 