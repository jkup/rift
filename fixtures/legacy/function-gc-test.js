// Test function + GC combination step by step
console.log("=== Step-by-step GC Test ===");

console.log("Step 1: Simple function with unreachable objects");
function createObjects() {
    var obj1 = { name: "object1", data: [1, 2, 3] };
    var obj2 = { name: "object2", data: [4, 5, 6] };  // This becomes unreachable
    return obj1;  // Only obj1 is returned, obj2 should be GC'd
}

var obj = createObjects();
console.log("Created object:", obj.name);

console.log("Step 2: First GC");
gc();
console.log("First GC completed");

console.log("Step 3: Test array access");
console.log("Array length:", obj.data.length);

console.log("Step 4: Second GC");
gc();
console.log("Second GC completed");

console.log("=== All steps completed ==="); 