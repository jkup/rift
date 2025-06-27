// Debug test for string methods
console.log("=== String Debug Test ===");

// Test basic string method access
var str = "hello";
console.log("String value:", str);

// Check if methods exist
console.log("charAt exists:", typeof str.charAt);
console.log("slice exists:", typeof str.slice);
console.log("trim exists:", typeof str.trim);

// Test simple method calls
console.log("Testing charAt:");
var char = str.charAt(1);
console.log("charAt(1):", char);

// Test method with debug output
console.log("Testing our newly added methods:");

try {
    var sliced = str.slice(1, 3);
    console.log("slice(1, 3):", sliced);
} catch (e) {
    console.log("slice error:", e);
}

try {
    var trimmed = "  test  ".trim();
    console.log("trim():", trimmed);
} catch (e) {
    console.log("trim error:", e);
}

console.log("=== Debug Test Complete ==="); 