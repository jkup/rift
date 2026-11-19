// Comprehensive try-catch-throw integration test
console.log("=== Comprehensive Try-Catch-Throw Test ===");

// Test 1: Basic integration test
console.log("Test 1: Basic integration");
function mayThrow(shouldThrow, value) {
    if (shouldThrow) {
        throw value;
    }
    return "success: " + value;
}

try {
    var result1 = mayThrow(false, "no exception");
    console.log("Result 1:", result1);
    
    var result2 = mayThrow(true, "exception thrown");
    console.log("ERROR: Should not execute");
} catch (e) {
    console.log("Caught:", e);
}

// Test 2: Error handling utility function
console.log("Test 2: Error handling utility");
function safeExecute(fn, defaultValue) {
    try {
        return fn();
    } catch (e) {
        console.log("Error caught by utility:", e);
        return defaultValue;
    }
}

var safeResult = safeExecute(function() {
    throw "utility error";
}, "default value");
console.log("Safe execute result:", safeResult);

var normalSafeResult = safeExecute(function() {
    return "normal execution";
}, "fallback");
console.log("Normal result:", normalSafeResult);

// Test 3: Exception type handling
console.log("Test 3: Exception type handling");
function processValue(value) {
    if (typeof value === "string") {
        if (value === "error") {
            throw "String error: " + value;
        }
        return "String: " + value;
    } else if (typeof value === "number") {
        if (value < 0) {
            throw value;
        }
        return "Number: " + value;
    } else {
        throw "Unknown type";
    }
}

// Test individual values
try {
    var result1 = processValue("hello");
    console.log("Processed hello:", result1);
} catch (e) {
    console.log("Failed to process hello:", e);
}

try {
    var result2 = processValue("error");
    console.log("ERROR: Should not execute");
} catch (e) {
    console.log("Failed to process error:", e);
}

try {
    var result3 = processValue(42);
    console.log("Processed 42:", result3);
} catch (e) {
    console.log("Failed to process 42:", e);
}

try {
    var result4 = processValue(-5);
    console.log("ERROR: Should not execute");
} catch (e) {
    console.log("Failed to process -5:", e);
}

// Test 4: Complex nested scenario
console.log("Test 4: Complex nested scenario");
function outerFunction() {
    console.log("Outer function start");
    try {
        innerFunction();
        console.log("ERROR: Should not reach here");
    } catch (e) {
        console.log("Outer caught:", e);
        if (typeof e === "number") {
            throw "Numeric error handled";
        }
        throw "Re-throwing: " + e;
    }
}

function innerFunction() {
    console.log("Inner function start");
    var condition = true;
    if (condition) {
        throw 404;
    }
}

try {
    outerFunction();
} catch (e) {
    console.log("Final handler:", e);
}

// Test 5: Simple validation
console.log("Test 5: Simple validation");
function validateInput(input) {
    if (typeof input !== "string") {
        throw "Input must be string";
    }
    if (input === "invalid") {
        throw "Input value not allowed";
    }
    return "Valid: " + input;
}

try {
    var valid1 = validateInput("hello");
    console.log("Validation result:", valid1);
} catch (e) {
    console.log("Validation error:", e);
}

try {
    var valid2 = validateInput("invalid");
    console.log("ERROR: Should not execute");
} catch (e) {
    console.log("Validation error:", e);
}

try {
    var valid3 = validateInput(123);
    console.log("ERROR: Should not execute");
} catch (e) {
    console.log("Validation error:", e);
}

console.log("=== Comprehensive Try-Catch-Throw Test Complete ==="); 