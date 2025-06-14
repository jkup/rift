// Test array methods specifically

console.log("=== Testing Array Methods ===");

var arr = [1, 2];
console.log("Initial array length:", arr.length);

// Test push method
console.log("Testing push method:");
var result = arr.push(3);
console.log("Push returned:", result);
console.log("Array length after push:", arr.length);

// Test pop method
console.log("Testing pop method:");
var popped = arr.pop();
console.log("Pop returned:", popped);
console.log("Array length after pop:", arr.length);

// Test toString method
console.log("Testing toString method:");
var str = arr.toString();
console.log("toString returned:", str);

console.log("=== Method Test Complete ===");
