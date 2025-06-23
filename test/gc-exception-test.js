// Test that GC works properly during exception handling
// This test verifies that we've fixed the permanent GC disable issue

console.log("=== GC Exception Handling Test ===");

// Create some objects before throwing
function createObjects() {
    var obj1 = { name: "object1", data: [1, 2, 3] };
    var obj2 = { name: "object2", data: [4, 5, 6] };
    return obj1;
}

// Test 1: Basic exception with GC
console.log("Test 1: Basic exception handling");
try {
    var obj = createObjects();
    console.log("Created object:", obj.name);
    
    // Force GC before throwing
    gc();
    console.log("GC completed before throw");
    
    throw "test exception";
} catch (e) {
    console.log("Caught exception:", e);
    
    // GC should work after exception handling
    gc();
    console.log("GC completed after catch");
}

// Test 2: Nested exceptions with GC
console.log("Test 2: Nested exception handling");
try {
    var outer = createObjects();
    try {
        var inner = createObjects();
        console.log("Created nested objects");
        
        // This should defer GC, not disable it permanently
        throw "inner exception";
    } catch (innerE) {
        console.log("Caught inner exception:", innerE);
        
        // Create more objects in catch block
        var catchObj = { name: "catch object" };
        
        // This should also defer GC properly
        throw "outer exception";
    }
} catch (outerE) {
    console.log("Caught outer exception:", outerE);
}

// Test 3: GC should work normally after all exceptions are handled
console.log("Test 3: GC after all exceptions");
gc();
console.log("Final GC completed successfully");

// Test 4: Verify GC stats are accessible
console.log("Test 4: GC stats");
gcStats();

console.log("=== All tests completed ==="); 