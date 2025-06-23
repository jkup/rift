// Test garbage collection with object creation and references
// NOTE: This test requires function declarations and for loops

console.log("=== GC Test ===");

console.log("UNSUPPORTED: Function declarations are not yet implemented");
console.log("UNSUPPORTED: for loops are not yet implemented");
console.log("UNSUPPORTED: Variable scoping in functions not supported");

console.log("SKIP: All advanced GC tests");
console.log("NOTE: Basic GC functionality works - see simple-gc-test.js");

// Test basic GC functionality without unsupported features
var globalObj = { name: "persistent", data: [1, 2, 3] };
var globalArray = [globalObj, "persistent data"];

if (globalObj.name == "persistent") {
    console.log("PASS: Object creation works");
} else {
    console.log("FAIL: Object creation works");
}

console.log("=== GC Stats Before Collection ===");
gcStats();

console.log("=== Running Garbage Collection ===");
gc();

console.log("=== GC Stats After Collection ===");
gcStats();

if (globalObj.name == "persistent") {
    console.log("PASS: Objects survive GC when referenced");
} else {
    console.log("FAIL: Objects survive GC when referenced");
}

console.log("=== GC Test Complete ===");
console.log("NOTE: Enable advanced tests after implementing functions and for loops"); 