// Increment and Decrement Operators Test
// Tests for ++ and -- operators in various forms

console.log("=== Increment/Decrement Operators Test ===");

// Test 1: Pre-increment
console.log("Test 1: Pre-increment (++x)");
var x = 5;
console.log("x before ++x:", x);
var result = ++x;
console.log("++x result:", result); // Should be 6
console.log("x after ++x:", x); // Should be 6
if (result == 6 && x == 6) console.log("PASS: Pre-increment works correctly");
if (result != 6 || x != 6) console.log("FAIL: Pre-increment failed");

// Test 2: Post-increment  
console.log("Test 2: Post-increment (x++)");
var y = 5;
console.log("y before y++:", y);
var result2 = y++;
console.log("y++ result:", result2); // Should be 5
console.log("y after y++:", y); // Should be 6
if (result2 == 5 && y == 6) console.log("PASS: Post-increment works correctly");
if (result2 != 5 || y != 6) console.log("FAIL: Post-increment failed");

// Test 3: Pre-decrement
console.log("Test 3: Pre-decrement (--x)");
var z = 5;
console.log("z before --z:", z);
var result3 = --z;
console.log("--z result:", result3); // Should be 4
console.log("z after --z:", z); // Should be 4
if (result3 == 4 && z == 4) console.log("PASS: Pre-decrement works correctly");
if (result3 != 4 || z != 4) console.log("FAIL: Pre-decrement failed");

// Test 4: Post-decrement
console.log("Test 4: Post-decrement (x--)");
var w = 5;
console.log("w before w--:", w);
var result4 = w--;
console.log("w-- result:", result4); // Should be 5
console.log("w after w--:", w); // Should be 4
if (result4 == 5 && w == 4) console.log("PASS: Post-decrement works correctly");
if (result4 != 5 || w != 4) console.log("FAIL: Post-decrement failed");

// Test 5: Use in for loop
console.log("Test 5: Increment in for loop");
console.log("Using i++ in for loop:");
var loopCount = 0;
for (var i = 0; i < 3; i++) {
    console.log("Loop iteration:", i);
    loopCount++;
}
if (loopCount == 3) console.log("PASS: For loop with increment works correctly");
if (loopCount != 3) console.log("FAIL: For loop with increment failed");

console.log("=== Increment/Decrement Operators Test Complete ===");
