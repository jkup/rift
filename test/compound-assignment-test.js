// Compound Assignment Operators Test
// Tests for +=, -=, *=, /=, %= operators

console.log("=== Compound Assignment Operators Test ===");

// Test 1: Addition Assignment (+=)
console.log("Test 1: Addition Assignment (+=)");
var a = 5;
a += 3;
if (a === 8) console.log("PASS: 5 += 3 = 8");
if (a !== 8) console.log("FAIL: 5 += 3 expected 8, got " + a);

// Test 2: Subtraction Assignment (-=)
console.log("Test 2: Subtraction Assignment (-=)");
var b = 10;
b -= 4;
if (b === 6) console.log("PASS: 10 -= 4 = 6");
if (b !== 6) console.log("FAIL: 10 -= 4 expected 6, got " + b);

// Test 3: Multiplication Assignment (*=)
console.log("Test 3: Multiplication Assignment (*=)");
var c = 6;
c *= 7;
if (c === 42) console.log("PASS: 6 *= 7 = 42");
if (c !== 42) console.log("FAIL: 6 *= 7 expected 42, got " + c);

// Test 4: Division Assignment (/=)
console.log("Test 4: Division Assignment (/=)");
var d = 20;
d /= 4;
if (d === 5) console.log("PASS: 20 /= 4 = 5");
if (d !== 5) console.log("FAIL: 20 /= 4 expected 5, got " + d);

// Test 5: Modulo Assignment (%=)
console.log("Test 5: Modulo Assignment (%=)");
var e = 17;
e %= 5;
if (e === 2) console.log("PASS: 17 %= 5 = 2");
if (e !== 2) console.log("FAIL: 17 %= 5 expected 2, got " + e);

// Test 6: String Concatenation with +=
console.log("Test 6: String Concatenation (+=)");
var str = "Hello";
str += " World";
if (str === "Hello World") console.log("PASS: String concatenation works");
if (str !== "Hello World") console.log("FAIL: String concatenation expected 'Hello World', got '" + str + "'");

// Test 7: Object Property Assignment
console.log("Test 7: Object Property Compound Assignment");
var obj = { x: 10, y: 5 };
obj.x += 5;
obj.y *= 2;
if (obj.x === 15) console.log("PASS: obj.x += 5 = 15");
if (obj.x !== 15) console.log("FAIL: obj.x += 5 expected 15, got " + obj.x);
if (obj.y === 10) console.log("PASS: obj.y *= 2 = 10");
if (obj.y !== 10) console.log("FAIL: obj.y *= 2 expected 10, got " + obj.y);

// Test 8: Array Element Assignment
console.log("Test 8: Array Element Compound Assignment");
var arr = [1, 2, 3, 4, 5];
arr[0] += 10;
arr[2] *= 3;
arr[4] -= 2;
if (arr[0] === 11) console.log("PASS: arr[0] += 10 = 11");
if (arr[0] !== 11) console.log("FAIL: arr[0] += 10 expected 11, got " + arr[0]);
if (arr[2] === 9) console.log("PASS: arr[2] *= 3 = 9");
if (arr[2] !== 9) console.log("FAIL: arr[2] *= 3 expected 9, got " + arr[2]);
if (arr[4] === 3) console.log("PASS: arr[4] -= 2 = 3");
if (arr[4] !== 3) console.log("FAIL: arr[4] -= 2 expected 3, got " + arr[4]);

// Test 9: Chained Operations
console.log("Test 9: Chained Compound Assignments");
var f = 10;
f += 5;
f *= 2;
f -= 10;
f /= 2;
if (f === 10) console.log("PASS: Chained operations: (((10+5)*2)-10)/2 = 10");
if (f !== 10) console.log("FAIL: Chained operations expected 10, got " + f);

// Test 10: Division by zero
console.log("Test 10: Division by Zero");
var g = 10;
g /= 0;
if (g === Infinity) console.log("PASS: 10 /= 0 = Infinity");
if (g !== Infinity) console.log("FAIL: 10 /= 0 expected Infinity, got " + g);

// Test 11: Modulo with negative numbers
console.log("Test 11: Modulo with Negative Numbers");
var h = -17;
h %= 5;
console.log("-17 % 5 = " + h);

// Test 12: Use in loops
console.log("Test 12: Compound Assignment in Loops");
var sum = 0;
var i = 1;
while (i < 6) {
    sum += i;
    i++;
}
if (sum === 15) console.log("PASS: Sum of 1-5 using += is 15");
if (sum !== 15) console.log("FAIL: Sum of 1-5 expected 15, got " + sum);

// Test 13: Return value of compound assignment
console.log("Test 13: Return Value of Compound Assignment");
var j = 5;
var result = (j += 3);
if (result === 8 && j === 8) console.log("PASS: Compound assignment returns new value");
if (result !== 8 || j !== 8) console.log("FAIL: Expected result=8, j=8, got result=" + result + ", j=" + j);

console.log("=== Compound Assignment Operators Test Complete ===");
