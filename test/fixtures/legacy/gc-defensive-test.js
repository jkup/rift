// Test to verify defensive programming in exception handling
// This test should work normally, but we can manually test edge cases

console.log("=== GC Defensive Programming Test ===");

// Test normal nested exception handling
console.log("Test 1: Normal nested exceptions");
try {
    try {
        try {
            console.log("Deep nested try block");
            throw "deep exception";
        } catch (e1) {
            console.log("Caught level 1:", e1);
            throw "level 1 exception";
        }
    } catch (e2) {
        console.log("Caught level 2:", e2);
        throw "level 2 exception";
    }
} catch (e3) {
    console.log("Caught level 3:", e3);
}

// Test that GC still works after complex exception handling
console.log("Test 2: GC after complex exceptions");
gc();
console.log("GC completed successfully");

// Test exception handling with object creation
console.log("Test 3: Object creation during exception handling");
try {
    var obj1 = { name: "before exception" };
    try {
        var obj2 = { name: "during nested exception" };
        throw "nested exception with objects";
    } catch (inner) {
        var obj3 = { name: "in catch block" };
        console.log("Inner catch:", inner);
        console.log("Objects created:", obj1.name, obj2.name, obj3.name);
    }
} catch (outer) {
    console.log("Outer catch:", outer);
}

// Final GC to ensure everything is working
console.log("Test 4: Final GC verification");
gc();
gcStats();

console.log("=== Defensive Programming Test Complete ==="); 