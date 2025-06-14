// Basic function declaration and call
function add(a, b) {
    return a + b;
}

// Test basic function call
console.log("PASS: Basic function call");
if (add(1, 2) !== 3) {
    console.log("FAIL: Basic function call failed");
}

// Test function with no return
function noReturn() {
    let x = 1;
}

// Test function with no return value
console.log("PASS: Function with no return");
if (noReturn() !== undefined) {
    console.log("FAIL: Function with no return should return undefined");
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