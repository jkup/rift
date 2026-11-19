// Comprehensive Do-While Loop Test
// Tests all major do-while loop functionality

console.log("=== Do-While Loop Comprehensive Test ===");

// Test 1: Basic do-while loop functionality
console.log("Test 1: Basic do-while loop");
var count = 0;
do {
    count = count + 1;
    console.log("Iteration:", count);
} while (count < 3);
console.log("Final count:", count);
if (count === 3) {
    console.log("PASS: Basic do-while works");
} else {
    console.log("FAIL: Basic do-while failed");
}

// Test 2: Do-while executes at least once (false condition)
console.log("\nTest 2: Do-while executes at least once with false condition");
var executed = false;
do {
    executed = true;
    console.log("Body executed once");
} while (false);
if (executed === true) {
    console.log("PASS: Do-while executes at least once");
} else {
    console.log("FAIL: Do-while should execute at least once");
}

// Test 3: Do-while with variable modification in condition
console.log("\nTest 3: Variable modification in loop");
var x = 5;
var iterations = 0;
do {
    console.log("x =", x);
    x = x - 1;
    iterations = iterations + 1;
} while (x > 0);
console.log("Total iterations:", iterations);
if (iterations === 5) {
    console.log("PASS: Variable modification works");
} else {
    console.log("FAIL: Variable modification failed");
}

// Test 4: Do-while with break statement
console.log("\nTest 4: Do-while with break statement");
var breakCount = 0;
do {
    breakCount = breakCount + 1;
    console.log("Break test iteration:", breakCount);
    if (breakCount === 2) {
        break;
    }
} while (breakCount < 10);
if (breakCount === 2) {
    console.log("PASS: Break statement works in do-while");
} else {
    console.log("FAIL: Break statement failed");
}

// Test 5: Do-while with continue statement
console.log("\nTest 5: Do-while with continue statement");
var continueCount = 0;
var processedCount = 0;
do {
    continueCount = continueCount + 1;
    if (continueCount === 2) {
        continue;
    }
    processedCount = processedCount + 1;
    console.log("Processed:", continueCount);
} while (continueCount < 4);
console.log("Continue count:", continueCount, "Processed count:", processedCount);
if (continueCount === 4 && processedCount === 3) {
    console.log("PASS: Continue statement works in do-while");
} else {
    console.log("FAIL: Continue statement failed");
}

// Test 6: Nested do-while loops
console.log("\nTest 6: Nested do-while loops");
var outerCount = 0;
var nestedTotal = 0;
do {
    outerCount = outerCount + 1;
    var innerCount = 0;
    do {
        innerCount = innerCount + 1;
        nestedTotal = nestedTotal + 1;
        console.log("Nested:", outerCount, innerCount);
    } while (innerCount < 2);
} while (outerCount < 2);
console.log("Nested total:", nestedTotal);
if (nestedTotal === 4) {
    console.log("PASS: Nested do-while loops work");
} else {
    console.log("FAIL: Nested do-while loops failed");
}

// Test 7: Do-while with complex condition
console.log("\nTest 7: Complex condition");
var a = 1;
var b = 3;
var complexCount = 0;
do {
    complexCount = complexCount + 1;
    a = a + 1;
    b = b - 1;
    console.log("Complex:", a, b);
} while (a < b);
console.log("Complex iterations:", complexCount);
if (complexCount === 1) {
    console.log("PASS: Complex condition works");
} else {
    console.log("FAIL: Complex condition failed");
}

// Test 8: Do-while with object property access
console.log("\nTest 8: Object property access in condition");
var obj = { value: 0, limit: 3 };
do {
    obj.value = obj.value + 1;
    console.log("Object value:", obj.value);
} while (obj.value < obj.limit);
if (obj.value === 3) {
    console.log("PASS: Object property access works");
} else {
    console.log("FAIL: Object property access failed");
}

// Test 9: Do-while with array processing
console.log("\nTest 9: Array processing");
var arr = [10, 20, 30];
var index = 0;
var sum = 0;
do {
    sum = sum + arr[index];
    console.log("Array element:", arr[index], "Sum:", sum);
    index = index + 1;
} while (index < arr.length);
if (sum === 60) {
    console.log("PASS: Array processing works");
} else {
    console.log("FAIL: Array processing failed");
}

// Test 10: Do-while with function calls
console.log("\nTest 10: Function calls in condition");
function shouldContinue(val) {
    return val < 3;
}
var funcCount = 0;
do {
    funcCount = funcCount + 1;
    console.log("Function test:", funcCount);
} while (shouldContinue(funcCount));
if (funcCount === 3) {
    console.log("PASS: Function calls in condition work");
} else {
    console.log("FAIL: Function calls in condition failed");
}

console.log("\n=== Do-While Loop Comprehensive Test Complete ===");
console.log("✅ All do-while loop features tested!");
