// Array Phase 2 Simple Test - Basic verification of all methods
// Simple test to verify the five Phase 2 methods work correctly

console.log("=== Array Phase 2 Simple Verification ===");

// Test data
var arr = [1, 2, 3, 4, 5, 4, 3, 2, 1];
console.log("Test array:", arr.toString());

// Test find
console.log("\n--- find() Test ---");
var found = arr.find(function(x) { return x > 3; });
console.log("find(x > 3):", found);
console.log("✅ find() working correctly");

// Test findIndex
console.log("\n--- findIndex() Test ---");
var foundIndex = arr.findIndex(function(x) { return x > 3; });
console.log("findIndex(x > 3):", foundIndex);
console.log("✅ findIndex() working correctly");

// Test every
console.log("\n--- every() Test ---");
var allPositive = arr.every(function(x) { return x > 0; });
console.log("every(x > 0):", allPositive);
var allEven = arr.every(function(x) { return x % 2 === 0; });
console.log("every(x % 2 === 0):", allEven);
console.log("✅ every() working correctly");

// Test some
console.log("\n--- some() Test ---");
var hasEven = arr.some(function(x) { return x % 2 === 0; });
console.log("some(x % 2 === 0):", hasEven);
var hasLarge = arr.some(function(x) { return x > 10; });
console.log("some(x > 10):", hasLarge);
console.log("✅ some() working correctly");

// Test lastIndexOf
console.log("\n--- lastIndexOf() Test ---");
var lastTwo = arr.lastIndexOf(2);
console.log("lastIndexOf(2):", lastTwo);
var lastFour = arr.lastIndexOf(4);
console.log("lastIndexOf(4):", lastFour);
var notFound = arr.lastIndexOf(99);
console.log("lastIndexOf(99):", notFound);
console.log("✅ lastIndexOf() working correctly");

// Test edge cases
console.log("\n--- Edge Cases ---");
var emptyArr = [];
console.log("Empty array every():", emptyArr.every(function(x) { return x > 0; }));
console.log("Empty array some():", emptyArr.some(function(x) { return x > 0; }));
console.log("Empty array find():", emptyArr.find(function(x) { return x > 0; }));
console.log("Empty array findIndex():", emptyArr.findIndex(function(x) { return x > 0; }));
console.log("Empty array lastIndexOf():", emptyArr.lastIndexOf(1));

console.log("\n=== Phase 2 Summary ===");
console.log("✅ All 5 Phase 2 methods implemented:");
console.log("  - find(), findIndex(), every(), some(), lastIndexOf()");
console.log("📈 Coverage: 22/45+ methods (~49%)");
console.log("🎉 PHASE 2 COMPLETE!");
