// Simple Do-While Loop Test
// Basic functionality tests for do-while loops

console.log("=== Simple Do-While Test ===");

// Test 1: Basic counting
console.log("Test 1: Basic counting");
var i = 0;
do {
    console.log("Count:", i);
    i = i + 1;
} while (i < 3);
console.log("Final i:", i);

// Test 2: Execute at least once
console.log("\nTest 2: Execute at least once with false condition");
var executed = false;
do {
    executed = true;
    console.log("Executed at least once");
} while (false);
console.log("Was executed:", executed);

// Test 3: Break statement
console.log("\nTest 3: Break statement");
var j = 0;
do {
    j = j + 1;
    console.log("j:", j);
    if (j === 2) {
        break;
    }
} while (j < 10);
console.log("Final j:", j);

// Test 4: Continue statement  
console.log("\nTest 4: Continue statement");
var k = 0;
do {
    k = k + 1;
    if (k === 2) {
        continue;
    }
    console.log("Processed k:", k);
} while (k < 4);
console.log("Final k:", k);

// Test 5: Comparison with while loop behavior
console.log("\nTest 5: Comparison with while loop");
console.log("While loop with false condition:");
var whileCount = 0;
while (false) {
    whileCount = whileCount + 1;
    console.log("While executed");
}
console.log("While count:", whileCount);

console.log("Do-while loop with false condition:");
var doWhileCount = 0;
do {
    doWhileCount = doWhileCount + 1;
    console.log("Do-while executed");
} while (false);
console.log("Do-while count:", doWhileCount);

console.log("\n=== Simple Do-While Test Complete ===");
if (i === 3 && executed === true && j === 2 && k === 4 && whileCount === 0 && doWhileCount === 1) {
    console.log("✅ ALL TESTS PASSED!");
} else {
    console.log("❌ Some tests failed");
}
