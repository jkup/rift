// Simple garbage collection test with assertions

console.log("=== Simple GC Test ===");

// Test GC functions exist and work
if (typeof gcStats == "function") {
    console.log("PASS: gcStats function exists");
} else {
    console.log("FAIL: gcStats function exists");
}

if (typeof gc == "function") {
    console.log("PASS: gc function exists");
} else {
    console.log("FAIL: gc function exists");
}

// Show initial GC stats
console.log("Initial GC stats:");
gcStats();

// Create some objects
var obj1 = { name: "test1", value: 42 };
var obj2 = { name: "test2", data: [1, 2, 3] };

if (obj1.name == "test1") {
    console.log("PASS: Object creation works");
} else {
    console.log("FAIL: Object creation works");
}

if (obj2.data.length == 3) {
    console.log("PASS: Nested object/array creation works");
} else {
    console.log("FAIL: Nested object/array creation works");
}

console.log("Created some objects");

// Show GC stats after object creation
console.log("GC stats after object creation:");
gcStats();

// Force garbage collection
console.log("Running garbage collection...");
gc();

// Show final stats
console.log("Final GC stats:");
gcStats();

// Test that objects are still accessible after GC
if (obj1.name == "test1") {
    console.log("PASS: Objects survive GC when still referenced");
} else {
    console.log("FAIL: Objects survive GC when still referenced");
}

if (obj2.data.length == 3) {
    console.log("PASS: Nested structures survive GC");
} else {
    console.log("FAIL: Nested structures survive GC");
}

console.log("=== Simple GC Test Complete ==="); 