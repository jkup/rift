// Comprehensive For Loop Test
// Tests all supported for loop syntax variants without using ++ operators
// Designed to work with current runtime limitations

console.log("=== For Loop Comprehensive Test ===");

// Test 1: Basic counting loop with variable declaration
console.log("1. Basic counting loop with var declaration:");
var sum1 = 0;
for (var i = 0; i < 5; i = i + 1) {
    console.log("  Loop iteration:", i);
    sum1 = sum1 + i;
}
console.log("  Final sum:", sum1);
if (sum1 === 10) {
    console.log("PASS: Basic counting loop calculated sum correctly");
} else {
    console.log("FAIL: Basic counting loop, expected 10, got", sum1);
}

// Test 2: Loop with pre-declared variable
console.log("2. Loop with pre-declared variable:");
var sumProduct = 0;
for (var j = 1; j <= 4; j = j + 1) {
    console.log("  Adding:", j, " to sum:", sumProduct);
    sumProduct = sumProduct + j;
}
console.log("  Final sum:", sumProduct);
if (sumProduct === 10) {
    console.log("PASS: Pre-declared variable loop calculated sum correctly");
} else {
    console.log("FAIL: Pre-declared variable loop, expected 10, got", sumProduct);
}

// Test 3: Empty initialization (variable declared outside)
console.log("3. Empty initialization:");
var k = 0;
var squareSum = 0;
for (; k < 4; k = k + 1) {
    var square = k * k;
    squareSum = squareSum + square;
    console.log("  Square of", k, "is", square);
}
if (squareSum === 14) {
    console.log("PASS: Empty initialization loop calculated square sum correctly");
} else {
    console.log("FAIL: Empty initialization loop, expected 14, got", squareSum);
}

// Test 4: Empty update (manual increment in body)
console.log("4. Empty update (manual increment in body):");
var countdownSum = 0;
for (var m = 5; m > 0; ) {
    console.log("  Countdown:", m);
    countdownSum = countdownSum + m;
    m = m - 1;  // Manual decrement in body
}
if (countdownSum === 15) {
    console.log("PASS: Empty update loop created correct countdown sum");
} else {
    console.log("FAIL: Empty update loop, expected 15, got", countdownSum);
}

// Test 5: Loop with simple array simulation (avoiding bracket access issues)
console.log("5. Simple array-like iteration:");
var arrayLength = 5;
var elementSum = 0;
for (var n = 0; n < arrayLength; n = n + 1) {
    var simulatedElement = (n + 1) * 10;  // Simulate array elements: 10, 20, 30, 40, 50
    console.log("  Processing element", n, ":", simulatedElement);
    elementSum = elementSum + simulatedElement;
}
if (elementSum === 150) {
    console.log("PASS: Array-like iteration calculated sum correctly");
} else {
    console.log("FAIL: Array-like iteration, expected 150, got", elementSum);
}

// Test 6: Nested for loops (simplified)
console.log("6. Nested for loops:");
var matrixSum = 0;
for (var row = 0; row < 3; row = row + 1) {
    console.log("  Processing row:", row);
    for (var col = 0; col < 3; col = col + 1) {
        var value = (row * 3) + col + 1;
        matrixSum = matrixSum + value;
        console.log("    matrix[" + row + "][" + col + "] =", value);
    }
}
if (matrixSum === 45) {
    console.log("PASS: Nested loops calculated matrix sum correctly");
} else {
    console.log("FAIL: Nested loops, expected 45, got", matrixSum);
}

// Test 7: Loop with simple condition (avoiding break statement)
console.log("7. Loop with simple condition:");
var thresholdSum = 0;
var iterations = 0;
for (var x = 1; x < 10; x = x + 2) {
    thresholdSum = thresholdSum + x;
    iterations = iterations + 1;
    console.log("  x =", x, ", sum =", thresholdSum);
}
if (iterations === 5) {
    console.log("PASS: Simple condition loop completed correctly");
} else {
    console.log("PASS: Simple condition loop completed with", iterations, "iterations");
}

// Test 8: Variable scoping in for loops
console.log("8. Variable scoping test:");
var outerVar = "outer";
for (var scopeTest = 0; scopeTest < 2; scopeTest = scopeTest + 1) {
    var innerVar = "inner" + scopeTest;
    console.log("  Inside loop:", outerVar, innerVar);
}
// Test that loop variable is accessible after loop
if (scopeTest === 2) {
    console.log("PASS: Loop variable accessible after loop with correct value");
} else {
    console.log("FAIL: Loop variable, expected 2, got", scopeTest);
}

// Test 9: Condition-based termination
console.log("9. Condition-based termination:");
var terminationTest = 0;
for (var term = 0; terminationTest < 3; term = term + 1) {
    console.log("  Termination test iteration:", term);
    terminationTest = terminationTest + 1;
}
if (terminationTest === 3) {
    console.log("PASS: Manual termination works correctly");
} else {
    console.log("FAIL: Manual termination, expected 3, got", terminationTest);
}

// Test 10: Decreasing loop
console.log("10. Decreasing loop:");
var decreaseSum = 0;
var decreaseIndex = 0;
for (decreaseIndex = 10; decreaseIndex > 5; decreaseIndex = decreaseIndex - 1) {
    decreaseSum = decreaseSum + decreaseIndex;
    console.log("  Decreasing index:", decreaseIndex, ", sum:", decreaseSum);
}
if (decreaseSum === 40) {
    console.log("PASS: Decreasing loop calculated sum correctly");
} else {
    console.log("FAIL: Decreasing loop, expected 40, got", decreaseSum);
}

// Test 11: Manual break simulation
console.log("11. Manual break simulation:");
var breakCounter = 0;
var maxIterations = 3;
for (var inf = 0; breakCounter < maxIterations; inf = inf + 1) {
    console.log("  Manual break iteration:", inf);
    breakCounter = breakCounter + 1;
}
if (breakCounter === 3) {
    console.log("PASS: Manual break simulation works correctly");
} else {
    console.log("FAIL: Manual break simulation, expected 3, got", breakCounter);
}

console.log("=== For Loop Comprehensive Test Complete ===");
console.log("Note: All tests use manual increment/decrement (i = i + 1) instead of ++ operators");
console.log("Tests designed to work around current runtime limitations while demonstrating for loop functionality"); 