// Nested try-catch and complex scenarios test
console.log("=== Nested Try-Catch Test ===");

// Test 1: Nested try-catch blocks
console.log("Test 1: Nested try-catch blocks");
try {
    console.log("Outer try block");
    try {
        console.log("Inner try block");
        throw "inner exception";
        console.log("ERROR: This should not execute");
    } catch (e) {
        console.log("Inner catch:", e);
        throw "outer exception";
    }
    console.log("ERROR: This should not execute");
} catch (e) {
    console.log("Outer catch:", e);
}

// Test 2: Exception propagation from inner to outer
console.log("Test 2: Exception propagation");
try {
    console.log("Outer try");
    try {
        console.log("Inner try");
        throw "propagating exception";
    } catch (e) {
        console.log("Inner catch, re-throwing:", e);
        throw e;
    }
} catch (e) {
    console.log("Outer catch received:", e);
}

// Test 3: Nested with different exception types
console.log("Test 3: Nested with different types");
try {
    try {
        throw 123;
    } catch (num) {
        console.log("Caught number:", num);
        throw "string from inner";
    }
} catch (str) {
    console.log("Caught string:", str);
}

// Test 4: Multiple levels of nesting
console.log("Test 4: Multiple levels");
try {
    try {
        try {
            throw "deep exception";
        } catch (e) {
            console.log("Level 3 catch:", e);
            throw "level 2 exception";
        }
    } catch (e) {
        console.log("Level 2 catch:", e);
        throw "level 1 exception";
    }
} catch (e) {
    console.log("Level 1 catch:", e);
}

console.log("=== Nested Try-Catch Test Complete ==="); 