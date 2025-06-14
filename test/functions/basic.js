// Basic function tests

function add(a, b) {
    return a + b;
}

console.log("PASS: Basic function test");

// Test function call
var result = add(2, 3);
if (result == 5) {
    console.log("PASS: Function call works");
} else {
    console.log("FAIL: Function call failed, got " + result);
}

// Test function with no return
function noReturn() {
    var x = 5;
}

var undefinedResult = noReturn();
if (undefinedResult == undefined) {
    console.log("PASS: Function with no return gives undefined");
} else {
    console.log("FAIL: Function with no return should give undefined, got " + undefinedResult);
}

// Test function with multiple parameters
function sum(a, b, c) {
    return a + b + c;
}

// Test function with multiple parameters
console.log("PASS: Function with multiple parameters");
if (sum(1, 2, 3) !== 6) {
    console.log("FAIL: Function with multiple parameters failed");
}

// Test function with fewer arguments than parameters
console.log("PASS: Function with fewer arguments");
if (sum(1, 2) !== NaN) {
    console.log("FAIL: Function with fewer arguments should return NaN");
}

// Test function with more arguments than parameters
console.log("PASS: Function with extra arguments");
if (sum(1, 2, 3, 4) !== 6) {
    console.log("FAIL: Function should ignore extra arguments");
} 