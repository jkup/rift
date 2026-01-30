// Test String.lastIndexOf()
// Regression tests:
// - Negative fromIndex was not clamped to 0 (searched from end instead)
// - Infinity/large fromIndex risked unsigned wrap-around

console.log("=== Testing String.lastIndexOf() ===");

// Basic behavior
if ("hello".lastIndexOf("l") === 3) {
    console.log("PASS: lastIndexOf finds last occurrence");
} else {
    console.log("FAIL: lastIndexOf('l') expected 3, got", "hello".lastIndexOf("l"));
}

if ("hello".lastIndexOf("h") === 0) {
    console.log("PASS: lastIndexOf finds char at start");
} else {
    console.log("FAIL: lastIndexOf('h') expected 0, got", "hello".lastIndexOf("h"));
}

if ("hello".lastIndexOf("z") === -1) {
    console.log("PASS: lastIndexOf returns -1 for missing char");
} else {
    console.log("FAIL: lastIndexOf('z') expected -1, got", "hello".lastIndexOf("z"));
}

// fromIndex parameter
if ("hello".lastIndexOf("l", 2) === 2) {
    console.log("PASS: lastIndexOf with fromIndex finds match at fromIndex");
} else {
    console.log("FAIL: lastIndexOf('l', 2) expected 2, got", "hello".lastIndexOf("l", 2));
}

if ("hello".lastIndexOf("l", 1) === -1) {
    console.log("PASS: lastIndexOf with fromIndex before any match returns -1");
} else {
    console.log("FAIL: lastIndexOf('l', 1) expected -1, got", "hello".lastIndexOf("l", 1));
}

// Negative fromIndex should clamp to 0
if ("hello".lastIndexOf("h", -1) === 0) {
    console.log("PASS: Negative fromIndex clamps to 0, finds 'h' at 0");
} else {
    console.log("FAIL: lastIndexOf('h', -1) expected 0, got", "hello".lastIndexOf("h", -1));
}

if ("hello".lastIndexOf("l", -1) === -1) {
    console.log("PASS: Negative fromIndex clamps to 0, no 'l' at position 0");
} else {
    console.log("FAIL: lastIndexOf('l', -1) expected -1, got", "hello".lastIndexOf("l", -1));
}

// Infinity fromIndex should be safe and search entire string
if ("hello".lastIndexOf("l", Infinity) === 3) {
    console.log("PASS: Infinity fromIndex searches entire string");
} else {
    console.log("FAIL: lastIndexOf('l', Infinity) expected 3, got", "hello".lastIndexOf("l", Infinity));
}

// NaN fromIndex defaults to string length (searches entire string)
if ("hello".lastIndexOf("l", NaN) === 3) {
    console.log("PASS: NaN fromIndex defaults to full search");
} else {
    console.log("FAIL: lastIndexOf('l', NaN) expected 3, got", "hello".lastIndexOf("l", NaN));
}

// fromIndex 0 should only check position 0
if ("hello".lastIndexOf("h", 0) === 0) {
    console.log("PASS: fromIndex 0 finds match at position 0");
} else {
    console.log("FAIL: lastIndexOf('h', 0) expected 0, got", "hello".lastIndexOf("h", 0));
}

if ("hello".lastIndexOf("e", 0) === -1) {
    console.log("PASS: fromIndex 0 does not find 'e' (only at position 1)");
} else {
    console.log("FAIL: lastIndexOf('e', 0) expected -1, got", "hello".lastIndexOf("e", 0));
}

// Multi-character search string
if ("abcabc".lastIndexOf("abc") === 3) {
    console.log("PASS: lastIndexOf finds last occurrence of substring");
} else {
    console.log("FAIL: lastIndexOf('abc') expected 3, got", "abcabc".lastIndexOf("abc"));
}

// Empty search string
if ("hello".lastIndexOf("") === 5) {
    console.log("PASS: lastIndexOf('') returns string length");
} else {
    console.log("FAIL: lastIndexOf('') expected 5, got", "hello".lastIndexOf(""));
}
