// Test to verify GC is working properly and not permanently disabled
console.log("=== GC Verification Test ===");

// Check initial GC state
console.log("Initial GC stats:");
gcStats();

// Create many objects to trigger GC
console.log("Creating many objects...");
var i = 0;
while (i < 50) {
    var obj = {
        id: i,
        data: [i, i+1, i+2],
        nested: {
            value: i * 2
        }
    };
    
    // Throw an exception every 10 objects to test exception handling
    if (i % 10 === 9) {
        try {
            throw "exception at " + i;
        } catch (e) {
            // Exception handled, GC should still work
        }
    }
    i = i + 1;
}

console.log("After creating objects:");
gcStats();

// Force GC
console.log("Forcing GC...");
gc();

console.log("After forced GC:");
gcStats();

// Test that GC continues to work after exceptions
console.log("Testing GC after exception handling...");
try {
    var testObj = { test: "value" };
    throw "final test exception";
} catch (e) {
    console.log("Caught:", e);
}

// GC should still work
gc();
console.log("Final GC stats:");
gcStats();

console.log("=== GC Verification Complete ==="); 