// Test file for prototype chain functionality

console.log("=== Prototype Chain Test ===");

// Test 1: Array literal should have prototype methods
var arr = [1, 2, 3];
console.log("Array created:", arr.toString());

// Test 2: Array.push should work via prototype
arr.push(4);
console.log("After push(4):", arr.toString());

// Test 3: Array.pop should work via prototype  
var popped = arr.pop();
console.log("Popped element:", popped);
console.log("After pop:", arr.toString());

// Test 4: Array constructor should create arrays with prototype
var arr2 = new Array(5, 6, 7);
console.log("Array constructor:", arr2.toString());

// Test 5: forEach should work via prototype
console.log("forEach test:");
arr2.forEach(function(element, index) {
    console.log("Index", index, ":", element);
});

// Test 6: map should work via prototype
var doubled = arr2.map(function(x) { return x * 2; });  
console.log("Doubled:", doubled.toString());

// Test 7: filter should work via prototype
var filtered = arr2.filter(function(x) { return x > 5; });
console.log("Filtered (>5):", filtered.toString());

console.log("=== Test Complete ==="); 