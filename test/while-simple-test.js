// Simple while loop test

console.log("Starting while loop test");

var i = 0;
while (i < 3) {
    console.log(i);
    i = i + 1;
}

console.log("While loop completed");
console.log("Final i value:", i);

// Test that while loop executed correctly
if (i === 3) {
    console.log("PASS: While loop executed 3 times correctly");
} else {
    console.log("FAIL: While loop executed 3 times correctly, got i =", i);
}

// Test that variables work correctly
if (typeof i === "number") {
    console.log("PASS: Variable type is correct (number)");
} else {
    console.log("FAIL: Variable type is correct (number), got", typeof i);
} 