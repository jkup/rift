// Test garbage collection with object creation and references

console.log("=== GC Test ===");

// Create some objects that should be collected
function createTempObjects() {
    var obj1 = { name: "temp1", value: 42 };
    var obj2 = { name: "temp2", ref: obj1 };
    var arr = [obj1, obj2, "test"];
    
    console.log("Created temporary objects");
    return "done";
}

// Create objects in a function scope (should be collected after function returns)
createTempObjects();

// Create some objects that should persist (referenced by global)
var globalObj = { name: "persistent", data: [1, 2, 3] };
var globalArray = [globalObj, "persistent data"];

console.log("Created persistent objects");

// Create more temporary objects in a loop
for (var i = 0; i < 10; i++) {
    var temp = { index: i, data: "temp" + i };
    // temp will go out of scope and should be collected
}

console.log("Created objects in loop");

console.log("Test completed - objects created and some should be eligible for GC");

// Show GC stats before collection
console.log("=== GC Stats Before Collection ===");
gcStats();

// Force garbage collection
console.log("=== Running Garbage Collection ===");
gc();

// Show GC stats after collection
console.log("=== GC Stats After Collection ===");
gcStats(); 