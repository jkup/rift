// Simple garbage collection test

console.log("=== Simple GC Test ===");

// Show initial GC stats
console.log("Initial GC stats:");
gcStats();

// Create some objects
var obj1 = { name: "test1", value: 42 };
var obj2 = { name: "test2", data: [1, 2, 3] };

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

console.log("Test completed!"); 