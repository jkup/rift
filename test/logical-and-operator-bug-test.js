// Logical AND Operator Bug Test
// This test documents a bug where the && operator doesn't work correctly

console.log("=== Logical AND Operator Bug Test ===");
console.log("This test demonstrates a known bug in the runtime");

// Individual boolean comparisons work fine
var a = 5;
var b = 2;

console.log("Individual comparisons:");
console.log("a == 5:", a == 5);  // Should be true
console.log("b == 2:", b == 2);  // Should be true

// But combining them with && fails
console.log("Combined with AND operator:");
console.log("a == 5 && b == 2:", a == 5 && b == 2);  // Should be true but returns false

// Test the bug explicitly
if (a == 5 && b == 2) {
    console.log("PASS: Logical AND operator works correctly");
} else {
    console.log("FAIL: Logical AND operator bug - true && true returns false");
}

// Test with simple boolean literals
console.log("Testing with boolean literals:");
console.log("true && true:", true && true);  // Should be true but likely returns false

if (true && true) {
    console.log("PASS: Boolean AND operator works correctly");
} else {
    console.log("FAIL: Boolean AND operator bug - true && true returns false");
}

// Test other AND combinations
console.log("Other AND combinations:");
console.log("true && false:", true && false);   // Should be false
console.log("false && true:", false && true);   // Should be false
console.log("false && false:", false && false); // Should be false

console.log("=== Logical AND Operator Bug Test Complete ===");
console.log("NOTE: This test will fail until the && operator is fixed in the runtime"); 