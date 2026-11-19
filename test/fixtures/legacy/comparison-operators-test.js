// Comparison Operators Test
// Tests for <, >, <=, >=, ==, !=, ===, !==

console.log("=== Comparison Operators Test ===");

// Test 1: Less than (<)
console.log("Test 1: Less Than (<)");
if (1 < 5 === true) console.log("PASS: 1 < 5 is true");
if (1 < 5 !== true) console.log("FAIL: 1 < 5 expected true");
if (5 < 1 === false) console.log("PASS: 5 < 1 is false");
if (5 < 1 !== false) console.log("FAIL: 5 < 1 expected false");
if (5 < 5 === false) console.log("PASS: 5 < 5 is false");
if (5 < 5 !== false) console.log("FAIL: 5 < 5 expected false");

// Test 2: Greater than (>)
console.log("Test 2: Greater Than (>)");
if (5 > 1 === true) console.log("PASS: 5 > 1 is true");
if (5 > 1 !== true) console.log("FAIL: 5 > 1 expected true");
if (1 > 5 === false) console.log("PASS: 1 > 5 is false");
if (1 > 5 !== false) console.log("FAIL: 1 > 5 expected false");
if (5 > 5 === false) console.log("PASS: 5 > 5 is false");
if (5 > 5 !== false) console.log("FAIL: 5 > 5 expected false");

// Test 3: Less than or equal (<=)
console.log("Test 3: Less Than or Equal (<=)");
if (1 <= 5 === true) console.log("PASS: 1 <= 5 is true");
if (1 <= 5 !== true) console.log("FAIL: 1 <= 5 expected true");
if (5 <= 5 === true) console.log("PASS: 5 <= 5 is true");
if (5 <= 5 !== true) console.log("FAIL: 5 <= 5 expected true");
if (6 <= 5 === false) console.log("PASS: 6 <= 5 is false");
if (6 <= 5 !== false) console.log("FAIL: 6 <= 5 expected false");

// Test 4: Greater than or equal (>=)
console.log("Test 4: Greater Than or Equal (>=)");
if (5 >= 1 === true) console.log("PASS: 5 >= 1 is true");
if (5 >= 1 !== true) console.log("FAIL: 5 >= 1 expected true");
if (5 >= 5 === true) console.log("PASS: 5 >= 5 is true");
if (5 >= 5 !== true) console.log("FAIL: 5 >= 5 expected true");
if (4 >= 5 === false) console.log("PASS: 4 >= 5 is false");
if (4 >= 5 !== false) console.log("FAIL: 4 >= 5 expected false");

// Test 5: <= and >= in while loops
console.log("Test 5: <= in While Loop");
var sum = 0;
var i = 1;
while (i <= 5) {
    sum += i;
    i++;
}
if (sum === 15) console.log("PASS: sum of 1-5 using <= = 15");
if (sum !== 15) console.log("FAIL: sum expected 15, got " + sum);

// Test 6: >= in while loop (countdown)
console.log("Test 6: >= in While Loop");
var countdown = "";
var j = 5;
while (j >= 1) {
    countdown += j;
    j--;
}
if (countdown === "54321") console.log("PASS: countdown using >= = '54321'");
if (countdown !== "54321") console.log("FAIL: countdown expected '54321', got " + countdown);

// Test 7: <= and >= with negative numbers
console.log("Test 7: Negative Numbers");
if (-5 <= -1 === true) console.log("PASS: -5 <= -1 is true");
if (-5 <= -1 !== true) console.log("FAIL: -5 <= -1 expected true");
if (-1 >= -5 === true) console.log("PASS: -1 >= -5 is true");
if (-1 >= -5 !== true) console.log("FAIL: -1 >= -5 expected true");

// Test 8: <= and >= with floating point
console.log("Test 8: Floating Point");
if (3.14 <= 3.15 === true) console.log("PASS: 3.14 <= 3.15 is true");
if (3.14 <= 3.15 !== true) console.log("FAIL: 3.14 <= 3.15 expected true");
if (3.14 >= 3.14 === true) console.log("PASS: 3.14 >= 3.14 is true");
if (3.14 >= 3.14 !== true) console.log("FAIL: 3.14 >= 3.14 expected true");

// Test 9: Equality (==)
console.log("Test 9: Equality (==)");
if ((5 == 5) === true) console.log("PASS: 5 == 5 is true");
if ((5 == 5) !== true) console.log("FAIL: 5 == 5 expected true");
if ((5 == 6) === false) console.log("PASS: 5 == 6 is false");
if ((5 == 6) !== false) console.log("FAIL: 5 == 6 expected false");

// Test 10: Inequality (!=)
console.log("Test 10: Inequality (!=)");
if ((5 != 6) === true) console.log("PASS: 5 != 6 is true");
if ((5 != 6) !== true) console.log("FAIL: 5 != 6 expected true");
if ((5 != 5) === false) console.log("PASS: 5 != 5 is false");
if ((5 != 5) !== false) console.log("FAIL: 5 != 5 expected false");

// Test 11: Strict equality (===)
console.log("Test 11: Strict Equality (===)");
if ((5 === 5) === true) console.log("PASS: 5 === 5 is true");
if ((5 === 5) !== true) console.log("FAIL: 5 === 5 expected true");
if (("5" === 5) === false) console.log("PASS: '5' === 5 is false");
if (("5" === 5) !== false) console.log("FAIL: '5' === 5 expected false");

// Test 12: Strict inequality (!==)
console.log("Test 12: Strict Inequality (!==)");
if (("5" !== 5) === true) console.log("PASS: '5' !== 5 is true");
if (("5" !== 5) !== true) console.log("FAIL: '5' !== 5 expected true");
if ((5 !== 5) === false) console.log("PASS: 5 !== 5 is false");
if ((5 !== 5) !== false) console.log("FAIL: 5 !== 5 expected false");

// Test 13: Comparison in conditional
console.log("Test 13: Comparison in Conditional");
var age = 18;
var canVote = age >= 18;
if (canVote === true) console.log("PASS: age >= 18 evaluates to true");
if (canVote !== true) console.log("FAIL: age >= 18 expected true");

// Test 14: Chained comparisons in conditions
console.log("Test 14: Combined Conditions");
var score = 75;
var passed = score >= 60 && score <= 100;
if (passed === true) console.log("PASS: 75 is between 60 and 100");
if (passed !== true) console.log("FAIL: 75 should be between 60 and 100");

// Test 15: Zero comparisons
console.log("Test 15: Zero Comparisons");
if (0 <= 0 === true) console.log("PASS: 0 <= 0 is true");
if (0 <= 0 !== true) console.log("FAIL: 0 <= 0 expected true");
if (0 >= 0 === true) console.log("PASS: 0 >= 0 is true");
if (0 >= 0 !== true) console.log("FAIL: 0 >= 0 expected true");
if (-0 <= 0 === true) console.log("PASS: -0 <= 0 is true");
if (-0 <= 0 !== true) console.log("FAIL: -0 <= 0 expected true");

console.log("=== Comparison Operators Test Complete ===");
