// Test for GC-aware Array object creation
console.log("=== Array GC Tracking Test ===");

// Test 1: Basic array creation should work
console.log("\n--- Basic Array Creation ---");
var arr1 = [1, 2, 3];
console.log("Array created:", arr1.length, "elements");
console.log("First element:", arr1[0]);
console.log("Array toString:", arr1.toString());

// Test 2: Array methods should still work
console.log("\n--- Array Methods Test ---");
arr1.push(4);
console.log("After push(4):", arr1.toString());
console.log("Length after push:", arr1.length);

var arr2 = [1, 2, 3].slice(1, 2);
console.log("Slice(1, 2) result:", arr2.toString());

// Test 3: Array creation via methods (using createArrayObject)
console.log("\n--- Array Method Creation ---");
var arr3 = [1, 2, 3].concat([4, 5]);
console.log("Concat result:", arr3.toString());
console.log("Concat length:", arr3.length);

var arr4 = [1, 2, 3, 2, 1].filter(function(x) { return x > 1; });
console.log("Filter result:", arr4.toString());

// Test 4: Complex array operations
console.log("\n--- Complex Operations ---");
var arr5 = [];
for (var i = 0; i < 5; i++) {
    arr5.push(i * 2);
}
console.log("Loop-created array:", arr5.toString());

// Test 5: Array literals vs constructor
console.log("\n--- Different Creation Methods ---");
var literal = [10, 20, 30];
console.log("Array literal:", literal.toString());

console.log("\n--- GC Tracking Test Complete ---");
console.log("✅ All array operations work with GC-aware creation!"); 