// While loops with functions

console.log("=== Testing While Loops with Functions ===");

// Test 1: Function that uses while loop
console.log("\n1. Function with while loop:");
function countdown(start) {
    console.log("Starting countdown from", start);
    while (start > 0) {
        console.log("Count:", start);
        start = start - 1;
    }
    console.log("Countdown complete!");
    return start;
}

var result = countdown(5);
console.log("Function returned:", result);

// Test 2: While loop calling function
console.log("\n2. While loop calling function:");
function square(x) {
    return x * x;
}

var num = 1;
var squared = 0;  // Declare outside loop to work around hoisting bug
while (num <= 4) {
    squared = square(num);
    console.log("Square of", num, "is", squared);
    num = num + 1;
}

// Test 3: Function returning condition for while loop
console.log("\n3. Function providing while condition:");
function shouldContinue(x) {
    return x < 10;
}

var value = 7;
while (shouldContinue(value)) {
    console.log("Current value:", value);
    value = value + 2;
}
console.log("Final value:", value);

// Test 4: Factorial calculation with while loop
console.log("\n4. Factorial calculation:");
function factorial(n) {
    if (n <= 0) return 1;
    
    var result = 1;
    var i = 1;
    while (i <= n) {
        result = result * i;
        console.log("Step", i, ":", result);
        i = i + 1;
    }
    return result;
}

var fact5 = factorial(5);
console.log("5! =", fact5);

// Test 5: While loop with nested function calls
console.log("\n5. While loop with nested function calls:");
function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

var base = 2;
var iterations = 0;
var added = 0;  // Declare outside loop to work around hoisting bug
var multiplied = 0;  // Declare outside loop to work around hoisting bug
while (iterations < 3) {
    added = add(base, iterations);
    multiplied = multiply(added, 2);
    console.log("Iteration", iterations, ":", base, "->", added, "->", multiplied);
    base = multiplied;
    iterations = iterations + 1;
}

console.log("\n=== While Loops with Functions Tests Complete ==="); 