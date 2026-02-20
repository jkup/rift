// Test Array.prototype.at (ES2022)

console.log("=== Testing Array.prototype.at ===");

var arr = [10, 20, 30, 40, 50];

// Positive indices
if (arr.at(0) === 10) {
    console.log("PASS: at(0) returns first element");
} else {
    console.log("FAIL: at(0) expected 10, got", arr.at(0));
}

if (arr.at(2) === 30) {
    console.log("PASS: at(2) returns third element");
} else {
    console.log("FAIL: at(2) expected 30, got", arr.at(2));
}

// Negative indices
if (arr.at(-1) === 50) {
    console.log("PASS: at(-1) returns last element");
} else {
    console.log("FAIL: at(-1) expected 50, got", arr.at(-1));
}

if (arr.at(-3) === 30) {
    console.log("PASS: at(-3) returns correct element");
} else {
    console.log("FAIL: at(-3) expected 30, got", arr.at(-3));
}

// Out of bounds
if (arr.at(10) === undefined) {
    console.log("PASS: at(10) returns undefined for out-of-bounds");
} else {
    console.log("FAIL: at(10) expected undefined, got", arr.at(10));
}

if (arr.at(-10) === undefined) {
    console.log("PASS: at(-10) returns undefined for negative out-of-bounds");
} else {
    console.log("FAIL: at(-10) expected undefined, got", arr.at(-10));
}

// Empty array
if ([].at(0) === undefined) {
    console.log("PASS: [].at(0) returns undefined");
} else {
    console.log("FAIL: [].at(0) expected undefined");
}

// No argument (defaults to 0)
if (arr.at() === 10) {
    console.log("PASS: at() with no arg returns first element");
} else {
    console.log("FAIL: at() with no arg expected 10, got", arr.at());
}

// Fractional index (truncated)
if (arr.at(1.9) === 20) {
    console.log("PASS: at(1.9) truncates to index 1");
} else {
    console.log("FAIL: at(1.9) expected 20, got", arr.at(1.9));
}

// Infinity
if (arr.at(Infinity) === undefined) {
    console.log("PASS: at(Infinity) returns undefined");
} else {
    console.log("FAIL: at(Infinity) expected undefined");
}

if (arr.at(-Infinity) === undefined) {
    console.log("PASS: at(-Infinity) returns undefined");
} else {
    console.log("FAIL: at(-Infinity) expected undefined");
}

console.log("=== Array.prototype.at tests complete ===");
