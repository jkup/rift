// Try-catch with different data types test
console.log("=== Try-Catch Data Types Test ===");

// Test 1: Throwing and catching strings
console.log("Test 1: String exceptions");
try {
    throw "String exception";
} catch (e) {
    console.log("Caught string:", e);
    console.log("Type check - string:", typeof e);
}

// Test 2: Throwing and catching numbers
console.log("Test 2: Number exceptions");
try {
    throw 42;
} catch (e) {
    console.log("Caught number:", e);
    console.log("Type check - number:", typeof e);
}

try {
    throw -17.5;
} catch (e) {
    console.log("Caught negative decimal:", e);
}

// Test 3: Throwing and catching booleans
console.log("Test 3: Boolean exceptions");
try {
    throw true;
} catch (e) {
    console.log("Caught true:", e);
    console.log("Type check - boolean:", typeof e);
}

try {
    throw false;
} catch (e) {
    console.log("Caught false:", e);
}

// Test 4: Throwing and catching null/undefined
console.log("Test 4: Null and undefined exceptions");
try {
    throw null;
} catch (e) {
    console.log("Caught null:", e);
    console.log("Type check - null:", typeof e);
}

try {
    throw undefined;
} catch (e) {
    console.log("Caught undefined:", e);
    console.log("Type check - undefined:", typeof e);
}

// Test 5: Variable expressions as exceptions
console.log("Test 5: Variable expressions");
var errorMessage = "Variable error message";
var errorCode = 500;

try {
    throw errorMessage;
} catch (e) {
    console.log("Caught variable string:", e);
}

try {
    throw errorCode;
} catch (e) {
    console.log("Caught variable number:", e);
}

// Test 6: Expression results as exceptions
console.log("Test 6: Expression results");
try {
    throw 10 + 20;
} catch (e) {
    console.log("Caught arithmetic result:", e);
}

try {
    throw "Error " + "concatenation";
} catch (e) {
    console.log("Caught string concatenation:", e);
}

// Test 7: Complex expressions
console.log("Test 7: Complex expressions");
var x = 5;
var y = 10;

try {
    throw x * y + 15;
} catch (e) {
    console.log("Caught complex arithmetic:", e);
}

console.log("=== Try-Catch Data Types Test Complete ==="); 