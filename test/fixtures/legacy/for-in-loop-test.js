// For-In Loop Test
// Tests for the for-in statement

console.log("=== For-In Loop Test ===");

// Test 1: Basic object iteration
console.log("Test 1: Basic Object Iteration");
var obj1 = { a: 1, b: 2, c: 3 };
var keys1 = "";
for (var key in obj1) {
    keys1 += key;
}
if (keys1 === "abc") console.log("PASS: Iterated over object keys 'abc'");
if (keys1 !== "abc") console.log("FAIL: Expected 'abc', got '" + keys1 + "'");

// Test 2: Access property values
console.log("Test 2: Access Property Values");
var obj2 = { x: 10, y: 20 };
var sum = 0;
for (var k in obj2) {
    sum += obj2[k];
}
if (sum === 30) console.log("PASS: Sum of values = 30");
if (sum !== 30) console.log("FAIL: Expected sum 30, got " + sum);

// Test 3: Array iteration (indices as strings)
console.log("Test 3: Array Iteration");
var arr = [100, 200, 300];
var indices = "";
for (var i in arr) {
    if (i !== "length") {  // Skip length property
        indices += i;
    }
}
if (indices === "012") console.log("PASS: Array indices '012'");
if (indices !== "012") console.log("FAIL: Expected '012', got '" + indices + "'");

// Test 4: Break in for-in
console.log("Test 4: Break in For-In");
var obj4 = { a: 1, b: 2, c: 3, d: 4 };
var count = 0;
for (var p in obj4) {
    count++;
    if (p === "b") break;
}
if (count === 2) console.log("PASS: Break stopped at count 2");
if (count !== 2) console.log("FAIL: Expected count 2, got " + count);

// Test 5: Continue in for-in
console.log("Test 5: Continue in For-In");
var obj5 = { a: 1, b: 2, c: 3 };
var result5 = "";
for (var q in obj5) {
    if (q === "b") continue;
    result5 += q;
}
if (result5 === "ac") console.log("PASS: Continue skipped 'b', got 'ac'");
if (result5 !== "ac") console.log("FAIL: Expected 'ac', got '" + result5 + "'");

// Test 6: Empty object
console.log("Test 6: Empty Object");
var empty = {};
var emptyCount = 0;
for (var e in empty) {
    emptyCount++;
}
if (emptyCount === 0) console.log("PASS: No iterations on empty object");
if (emptyCount !== 0) console.log("FAIL: Expected 0, got " + emptyCount);

// Test 7: Nested for-in loops
console.log("Test 7: Nested For-In");
var outer = { a: { x: 1 }, b: { y: 2 } };
var nestedKeys = "";
for (var o in outer) {
    for (var inner in outer[o]) {
        nestedKeys += o + inner;
    }
}
if (nestedKeys === "axby") console.log("PASS: Nested for-in 'axby'");
if (nestedKeys !== "axby") console.log("FAIL: Expected 'axby', got '" + nestedKeys + "'");

// Test 8: For-in with let declaration
console.log("Test 8: For-In with Let");
var obj8 = { m: 1, n: 2 };
var letKeys = "";
for (let lk in obj8) {
    letKeys += lk;
}
if (letKeys === "mn") console.log("PASS: for (let x in obj) works");
if (letKeys !== "mn") console.log("FAIL: Expected 'mn', got '" + letKeys + "'");

// Test 9: For-in with existing variable
console.log("Test 9: For-In with Existing Variable");
var existingVar = "initial";
var obj9 = { first: 1, second: 2 };
for (existingVar in obj9) {
    // Just iterating
}
// existingVar should be the last key
if (existingVar === "second") console.log("PASS: Existing var holds last key 'second'");
if (existingVar !== "second") console.log("FAIL: Expected 'second', got '" + existingVar + "'");

// Test 10: Count object properties
console.log("Test 10: Count Properties");
var countObj = { one: 1, two: 2, three: 3, four: 4, five: 5 };
var propCount = 0;
for (var _ in countObj) {
    propCount++;
}
if (propCount === 5) console.log("PASS: Counted 5 properties");
if (propCount !== 5) console.log("FAIL: Expected 5, got " + propCount);

// Test 11: Collect keys into array
console.log("Test 11: Collect Keys");
var collectObj = { red: "#f00", green: "#0f0", blue: "#00f" };
var collectedKeys = [];
for (var color in collectObj) {
    collectedKeys.push(color);
}
if (collectedKeys.length === 3) console.log("PASS: Collected 3 keys");
if (collectedKeys.length !== 3) console.log("FAIL: Expected 3 keys, got " + collectedKeys.length);

// Test 12: For-in doesn't iterate primitives
console.log("Test 12: Non-Object Values");
var primitiveCount = 0;
for (var v in null) {
    primitiveCount++;
}
for (var v in undefined) {
    primitiveCount++;
}
if (primitiveCount === 0) console.log("PASS: No iteration on null/undefined");
if (primitiveCount !== 0) console.log("FAIL: Expected 0, got " + primitiveCount);

// Test 13: String iteration (by index)
console.log("Test 13: String Iteration");
var str = "abc";
var strIndices = "";
for (var si in str) {
    strIndices += si;
}
if (strIndices === "012") console.log("PASS: String indices '012'");
if (strIndices !== "012") console.log("FAIL: Expected '012', got '" + strIndices + "'");

// Test 14: For-in in function
console.log("Test 14: For-In in Function");
function getKeys(obj) {
    var keys = [];
    for (var k in obj) {
        keys.push(k);
    }
    return keys;
}
var funcKeys = getKeys({ foo: 1, bar: 2 });
if (funcKeys.length === 2) console.log("PASS: Function with for-in returns 2 keys");
if (funcKeys.length !== 2) console.log("FAIL: Expected 2, got " + funcKeys.length);

// Test 15: Modify object while iterating (add property)
console.log("Test 15: Object with Numeric-like Keys");
var numObj = { "1": "one", "2": "two", "3": "three" };
var numKeys = "";
for (var nk in numObj) {
    numKeys += nk;
}
if (numKeys === "123") console.log("PASS: Numeric keys '123'");
if (numKeys !== "123") console.log("FAIL: Expected '123', got '" + numKeys + "'");

console.log("=== For-In Loop Test Complete ===");
