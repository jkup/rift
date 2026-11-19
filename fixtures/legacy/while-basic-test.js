// Basic while loop tests

console.log("=== Testing Basic While Loops ===");

// Test 1: Simple counting loop
console.log("\n1. Simple counting loop:");
var i = 0;
while (i < 3) {
    console.log("Count:", i);
    i = i + 1;
}
console.log("Final i:", i);

// Test that simple counting loop worked
if (i === 3) {
    console.log("PASS: Simple counting loop worked correctly");
} else {
    console.log("FAIL: Simple counting loop worked correctly, got i =", i);
}

// Test 2: While loop with condition false from start
console.log("\n2. While loop with false condition:");
var j = 5;
while (j < 3) {
    console.log("This should not print");
    j = j + 1;
}
console.log("j value unchanged:", j);

// Test that false condition loop didn't execute
if (j === 5) {
    console.log("PASS: False condition loop didn't execute");
} else {
    console.log("FAIL: False condition loop didn't execute, got j =", j);
}

// Test 3: While loop that modifies multiple variables
console.log("\n3. Multiple variable modification:");
var a = 1;
var b = 10;
while (a < 5) {
    console.log("a:", a, "b:", b);
    a = a + 1;
    b = b - 2;
}
console.log("Final a:", a, "b:", b);

// Test that multiple variable modification worked
if (a == 5) {
    if (b == 2) {
        console.log("PASS: Multiple variable modification worked correctly");
    } else {
        console.log("FAIL: Multiple variable modification worked correctly, b =", b, "expected 2");
    }
} else {
    console.log("FAIL: Multiple variable modification worked correctly, a =", a, "expected 5");
}

// Test 4: While loop with string condition
console.log("\n4. String condition (truthy):");
var message = "hello";
var count = 0;
while (message) {
    console.log("Message:", message, "Count:", count);
    count = count + 1;
    if (count >= 2) {
        message = "";  // Make condition falsy
    }
}

// Test 5: Nested while loops
console.log("\n5. Nested while loops:");
var outer = 0;
while (outer < 2) {
    console.log("Outer:", outer);
    var inner = 0;
    while (inner < 3) {
        console.log("  Inner:", inner);
        inner = inner + 1;
    }
    outer = outer + 1;
}

console.log("\n=== Basic While Loop Tests Complete ==="); 