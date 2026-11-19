// Test numeric literal parsing for hex, octal, and binary
// Regression tests:
// - Octal/binary digits were not validated (0o89 and 0b2 were accepted)
// - Octal/binary literals evaluated to 0 instead of their correct values

console.log("=== Testing Numeric Literals ===");

// Hex literals
if (0xFF === 255) {
    console.log("PASS: 0xFF equals 255");
} else {
    console.log("FAIL: 0xFF expected 255, got", 0xFF);
}

if (0x0 === 0) {
    console.log("PASS: 0x0 equals 0");
} else {
    console.log("FAIL: 0x0 expected 0, got", 0x0);
}

if (0x10 === 16) {
    console.log("PASS: 0x10 equals 16");
} else {
    console.log("FAIL: 0x10 expected 16, got", 0x10);
}

// Octal literals
if (0o0 === 0) {
    console.log("PASS: 0o0 equals 0");
} else {
    console.log("FAIL: 0o0 expected 0, got", 0o0);
}

if (0o7 === 7) {
    console.log("PASS: 0o7 equals 7");
} else {
    console.log("FAIL: 0o7 expected 7, got", 0o7);
}

if (0o10 === 8) {
    console.log("PASS: 0o10 equals 8");
} else {
    console.log("FAIL: 0o10 expected 8, got", 0o10);
}

if (0o17 === 15) {
    console.log("PASS: 0o17 equals 15");
} else {
    console.log("FAIL: 0o17 expected 15, got", 0o17);
}

if (0o777 === 511) {
    console.log("PASS: 0o777 equals 511");
} else {
    console.log("FAIL: 0o777 expected 511, got", 0o777);
}

// Binary literals
if (0b0 === 0) {
    console.log("PASS: 0b0 equals 0");
} else {
    console.log("FAIL: 0b0 expected 0, got", 0b0);
}

if (0b1 === 1) {
    console.log("PASS: 0b1 equals 1");
} else {
    console.log("FAIL: 0b1 expected 1, got", 0b1);
}

if (0b10 === 2) {
    console.log("PASS: 0b10 equals 2");
} else {
    console.log("FAIL: 0b10 expected 2, got", 0b10);
}

if (0b101 === 5) {
    console.log("PASS: 0b101 equals 5");
} else {
    console.log("FAIL: 0b101 expected 5, got", 0b101);
}

if (0b11111111 === 255) {
    console.log("PASS: 0b11111111 equals 255");
} else {
    console.log("FAIL: 0b11111111 expected 255, got", 0b11111111);
}

// Decimal still works
if (42 === 42) {
    console.log("PASS: Decimal 42 works");
} else {
    console.log("FAIL: Decimal 42 broken");
}

if (0 === 0) {
    console.log("PASS: Decimal 0 works");
} else {
    console.log("FAIL: Decimal 0 broken");
}
