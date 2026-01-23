// Compound Assignment Operators Test
// Tests for +=, -=, *=, /=, %=

console.log("=== Compound Assignment Operators Test ===");

// Test 1: Addition assignment (+=)
console.log("Test 1: Addition Assignment (+=)");
var a = 5;
a += 3;
if (a === 8) console.log("PASS: 5 += 3 = 8");
if (a !== 8) console.log("FAIL: 5 += 3 expected 8, got " + a);

// Test 2: Subtraction assignment (-=)
console.log("Test 2: Subtraction Assignment (-=)");
var b = 10;
b -= 4;
if (b === 6) console.log("PASS: 10 -= 4 = 6");
if (b !== 6) console.log("FAIL: 10 -= 4 expected 6, got " + b);

// Test 3: Multiplication assignment (*=)
console.log("Test 3: Multiplication Assignment (*=)");
var c = 6;
c *= 7;
if (c === 42) console.log("PASS: 6 *= 7 = 42");
if (c !== 42) console.log("FAIL: 6 *= 7 expected 42, got " + c);

// Test 4: Division assignment (/=)
console.log("Test 4: Division Assignment (/=)");
var d = 20;
d /= 4;
if (d === 5) console.log("PASS: 20 /= 4 = 5");
if (d !== 5) console.log("FAIL: 20 /= 4 expected 5, got " + d);

// Test 5: Modulo assignment (%=)
console.log("Test 5: Modulo Assignment (%=)");
var e = 17;
e %= 5;
if (e === 2) console.log("PASS: 17 %= 5 = 2");
if (e !== 2) console.log("FAIL: 17 %= 5 expected 2, got " + e);

// Test 6: String concatenation with +=
console.log("Test 6: String Concatenation (+=)");
var str = "Hello";
str += " World";
if (str === "Hello World") console.log("PASS: 'Hello' += ' World' = 'Hello World'");
if (str !== "Hello World") console.log("FAIL: string += expected 'Hello World', got " + str);

// Test 7: Mixed string/number concatenation
console.log("Test 7: Mixed String/Number Concatenation");
var mixed = "Count: ";
mixed += 42;
if (mixed === "Count: 42") console.log("PASS: 'Count: ' += 42 = 'Count: 42'");
if (mixed !== "Count: 42") console.log("FAIL: mixed += expected 'Count: 42', got " + mixed);

// Test 8: Object property compound assignment
console.log("Test 8: Object Property Compound Assignment");
var obj = { value: 10 };
obj.value += 5;
if (obj.value === 15) console.log("PASS: obj.value += 5 = 15");
if (obj.value !== 15) console.log("FAIL: obj.value += 5 expected 15, got " + obj.value);

obj.value -= 3;
if (obj.value === 12) console.log("PASS: obj.value -= 3 = 12");
if (obj.value !== 12) console.log("FAIL: obj.value -= 3 expected 12, got " + obj.value);

obj.value *= 2;
if (obj.value === 24) console.log("PASS: obj.value *= 2 = 24");
if (obj.value !== 24) console.log("FAIL: obj.value *= 2 expected 24, got " + obj.value);

obj.value /= 6;
if (obj.value === 4) console.log("PASS: obj.value /= 6 = 4");
if (obj.value !== 4) console.log("FAIL: obj.value /= 6 expected 4, got " + obj.value);

obj.value %= 3;
if (obj.value === 1) console.log("PASS: obj.value %= 3 = 1");
if (obj.value !== 1) console.log("FAIL: obj.value %= 3 expected 1, got " + obj.value);

// Test 9: Array element compound assignment
console.log("Test 9: Array Element Compound Assignment");
var arr = [10, 20, 30];
arr[0] += 5;
if (arr[0] === 15) console.log("PASS: arr[0] += 5 = 15");
if (arr[0] !== 15) console.log("FAIL: arr[0] += 5 expected 15, got " + arr[0]);

arr[1] *= 2;
if (arr[1] === 40) console.log("PASS: arr[1] *= 2 = 40");
if (arr[1] !== 40) console.log("FAIL: arr[1] *= 2 expected 40, got " + arr[1]);

// Test 10: Computed property compound assignment
console.log("Test 10: Computed Property Compound Assignment");
var data = { x: 100 };
var key = "x";
data[key] -= 25;
if (data.x === 75) console.log("PASS: data[key] -= 25 = 75");
if (data.x !== 75) console.log("FAIL: data[key] -= 25 expected 75, got " + data.x);

// Test 11: Chained compound assignment
console.log("Test 11: Chained Operations");
var chain = 2;
chain += 3;  // 5
chain *= 4;  // 20
chain -= 5;  // 15
chain /= 3;  // 5
if (chain === 5) console.log("PASS: chained operations result = 5");
if (chain !== 5) console.log("FAIL: chained operations expected 5, got " + chain);

// Test 12: Floating point compound assignment
console.log("Test 12: Floating Point Operations");
var f = 0.1;
f += 0.2;
// Due to floating point precision, check if close enough
if (f > 0.29 && f < 0.31) console.log("PASS: 0.1 += 0.2 approximately 0.3");
if (f <= 0.29 || f >= 0.31) console.log("FAIL: 0.1 += 0.2 expected ~0.3, got " + f);

// Test 13: Negative number compound assignment
console.log("Test 13: Negative Numbers");
var neg = -10;
neg += 5;
if (neg === -5) console.log("PASS: -10 += 5 = -5");
if (neg !== -5) console.log("FAIL: -10 += 5 expected -5, got " + neg);

neg *= -2;
if (neg === 10) console.log("PASS: -5 *= -2 = 10");
if (neg !== 10) console.log("FAIL: -5 *= -2 expected 10, got " + neg);

// Test 14: Division by zero
console.log("Test 14: Division by Zero");
var inf = 10;
inf /= 0;
if (inf === Infinity) console.log("PASS: 10 /= 0 = Infinity");
if (inf !== Infinity) console.log("FAIL: 10 /= 0 expected Infinity, got " + inf);

// Test 15: Modulo with negative numbers
console.log("Test 15: Modulo with Negatives");
var mod = -17;
mod %= 5;
if (mod === -2) console.log("PASS: -17 %= 5 = -2");
if (mod !== -2) console.log("FAIL: -17 %= 5 expected -2, got " + mod);

// Test 16: Assignment expression returns value
console.log("Test 16: Assignment Expression Value");
var ret = 10;
var result = (ret += 5);
if (result === 15 && ret === 15) console.log("PASS: (ret += 5) returns 15");
if (result !== 15 || ret !== 15) console.log("FAIL: (ret += 5) expected 15, got " + result);

// Test 17: Compound assignment in loop
console.log("Test 17: Compound Assignment in Loop");
var sum = 0;
var i = 1;
while (i < 6) {  // Using < instead of <= due to separate <= bug
    sum += i;
    i++;
}
if (sum === 15) console.log("PASS: sum of 1-5 using += = 15");
if (sum !== 15) console.log("FAIL: sum of 1-5 expected 15, got " + sum);

// Test 18: Factorial using *=
console.log("Test 18: Factorial using *=");
var factorial = 1;
var n = 1;
while (n < 6) {  // Using < instead of <= due to separate <= bug
    factorial *= n;
    n++;
}
if (factorial === 120) console.log("PASS: 5! using *= = 120");
if (factorial !== 120) console.log("FAIL: 5! expected 120, got " + factorial);

console.log("=== Compound Assignment Operators Test Complete ===");
