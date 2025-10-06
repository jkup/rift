// Error Types Test - Comprehensive error type constructor tests
// Tests TypeError, ReferenceError, SyntaxError, RangeError

// Test 1: TypeError constructor
console.log("Test 1: TypeError constructor");
try {
    const err = new TypeError("Invalid type");
    console.log("✓ TypeError created");
    console.log("✓ name:", err.name);
    console.log("✓ message:", err.message);
    console.log("✓ toString:", err.toString());
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 2: ReferenceError constructor
console.log("\nTest 2: ReferenceError constructor");
try {
    const err = new ReferenceError("Variable not defined");
    console.log("✓ ReferenceError created");
    console.log("✓ name:", err.name);
    console.log("✓ message:", err.message);
    console.log("✓ toString:", err.toString());
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 3: SyntaxError constructor
console.log("\nTest 3: SyntaxError constructor");
try {
    const err = new SyntaxError("Unexpected token");
    console.log("✓ SyntaxError created");
    console.log("✓ name:", err.name);
    console.log("✓ message:", err.message);
    console.log("✓ toString:", err.toString());
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 4: RangeError constructor
console.log("\nTest 4: RangeError constructor");
try {
    const err = new RangeError("Value out of range");
    console.log("✓ RangeError created");
    console.log("✓ name:", err.name);
    console.log("✓ message:", err.message);
    console.log("✓ toString:", err.toString());
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 5: TypeError without message
console.log("\nTest 5: TypeError without message");
try {
    const err = new TypeError();
    console.log("✓ TypeError created without message");
    console.log("✓ name:", err.name);
    console.log("✓ message:", err.message === undefined ? "undefined" : err.message);
    console.log("✓ toString:", err.toString());
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 6: Error type constructors exist in global scope
console.log("\nTest 6: Error type constructors in global scope");
try {
    console.log("✓ TypeError exists:", typeof TypeError === "function");
    console.log("✓ ReferenceError exists:", typeof ReferenceError === "function");
    console.log("✓ SyntaxError exists:", typeof SyntaxError === "function");
    console.log("✓ RangeError exists:", typeof RangeError === "function");
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 7: Error type toString format
console.log("\nTest 7: Error type toString format");
try {
    const t = new TypeError("type error");
    const r = new ReferenceError("ref error");
    const s = new SyntaxError("syntax error");
    const rng = new RangeError("range error");
    
    console.log("✓ TypeError format:", t.toString());
    console.log("✓ ReferenceError format:", r.toString());
    console.log("✓ SyntaxError format:", s.toString());
    console.log("✓ RangeError format:", rng.toString());
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 8: Error types with empty string message
console.log("\nTest 8: Error types with empty string message");
try {
    const err = new TypeError("");
    console.log("✓ TypeError created with empty message");
    console.log("✓ message:", err.message === "" ? '""' : err.message);
    console.log("✓ toString:", err.toString());
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 9: Error types can be created without 'new'
console.log("\nTest 9: Error types without 'new' keyword");
try {
    const err = TypeError("without new");
    console.log("✓ TypeError created without 'new'");
    console.log("✓ message:", err.message);
} catch (e) {
    console.log("✗ Failed:", e);
}

// Test 10: Multiple error instances
console.log("\nTest 10: Multiple error instances");
try {
    const err1 = new TypeError("first");
    const err2 = new TypeError("second");
    console.log("✓ First error:", err1.message);
    console.log("✓ Second error:", err2.message);
    console.log("✓ Errors are independent:", err1.message !== err2.message);
} catch (e) {
    console.log("✗ Failed:", e);
}

console.log("\n=== All error type tests completed ===");
