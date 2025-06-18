// Try-catch with control flow test
console.log("=== Try-Catch Control Flow Test ===");

// Test 1: Try-catch inside while loop
console.log("Test 1: Try-catch in while loop");
var i = 0;
while (i < 3) {
    console.log("Loop iteration:", i);
    try {
        if (i == 1) {
            throw "exception at iteration " + i;
        }
        console.log("Normal execution at iteration:", i);
    } catch (e) {
        console.log("Caught in loop:", e);
    }
    i = i + 1;
}

// Test 2: Exception breaking out of loop
console.log("Test 2: Exception breaking loop");
try {
    var j = 0;
    while (j < 5) {
        console.log("Loop j:", j);
        if (j == 2) {
            throw "breaking loop";
        }
        j = j + 1;
    }
    console.log("ERROR: Should not reach here");
} catch (e) {
    console.log("Loop broken by exception:", e);
}

// Test 3: Try-catch with if statements
console.log("Test 3: Try-catch with conditionals");
var condition = true;

try {
    if (condition) {
        console.log("Condition is true");
        throw "conditional exception";
    } else {
        console.log("Condition is false");
    }
} catch (e) {
    console.log("Caught conditional exception:", e);
}

// Test 4: Nested control structures
console.log("Test 4: Nested control structures");
try {
    var k = 0;
    while (k < 2) {
        console.log("Outer loop k:", k);
        if (k == 1) {
            var m = 0;
            while (m < 2) {
                console.log("Inner loop m:", m);
                if (m == 1) {
                    throw "nested loop exception";
                }
                m = m + 1;
            }
        }
        k = k + 1;
    }
} catch (e) {
    console.log("Caught from nested structure:", e);
}

// Test 5: Multiple try-catch blocks in sequence
console.log("Test 5: Sequential try-catch blocks");
try {
    console.log("First try block");
    throw "first exception";
} catch (e) {
    console.log("First catch:", e);
}

try {
    console.log("Second try block");
    throw "second exception";
} catch (e) {
    console.log("Second catch:", e);
}

console.log("Between try-catch blocks");

try {
    console.log("Third try block - no exception");
    var result = 42;
} catch (e) {
    console.log("ERROR: Third catch should not execute");
}

console.log("After all try-catch blocks");

// Test 6: Variable scope across try-catch and loops
console.log("Test 6: Variable scope");
var outerVar = "outer";

try {
    var tryVar = "try";
    var n = 0;
    while (n < 2) {
        var loopVar = "loop " + n;
        if (n == 1) {
            throw loopVar;
        }
        n = n + 1;
    }
} catch (loopVar) {
    console.log("Caught loop variable:", loopVar);
    console.log("Try variable still accessible:", tryVar);
}

console.log("Outer variable:", outerVar);

console.log("=== Try-Catch Control Flow Test Complete ==="); 