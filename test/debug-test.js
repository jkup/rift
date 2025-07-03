// Debug test without while loops

console.log("Testing basic functionality");

var i = 0;
console.log("Initial i:", i);

// Test basic variable assignment
if (i === 0) {
    console.log("PASS: Variable assignment works");
} else {
    console.log("FAIL: Variable assignment works, got", i);
}

i = i + 1;
console.log("After increment:", i);

// Test basic arithmetic
if (i === 1) {
    console.log("PASS: Arithmetic increment works");
} else {
    console.log("FAIL: Arithmetic increment works, got", i);
}

// Test conditional logic
if (i < 3) {
    console.log("PASS: Conditional logic works (i < 3)");
} else {
    console.log("FAIL: Conditional logic works (i < 3)");
}

console.log("Debug test complete"); 