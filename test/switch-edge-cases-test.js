// Switch Statement Edge Cases Test
console.log("=== Switch Edge Cases Test ===");

// Test 1: Expression in case
console.log("Test 1: Expression as discriminant");
var a = 5;
var b = 3;
var result1;
switch(a + b) {
    case 7:
        result1 = "seven";
        break;
    case 8:
        result1 = "eight";
        break;
    default:
        result1 = "other";
        break;
}
console.log("Result:", result1);
console.log("Expected: eight");

// Test 2: Nested statements in case
console.log("\nTest 2: Multiple statements in case");
var value = 1;
var total = 0;
var count = 0;
switch(value) {
    case 1:
        total = total + 10;
        count = count + 1;
        break;
    case 2:
        total = total + 20;
        count = count + 2;
        break;
}
console.log("Total:", total);
console.log("Count:", count);
console.log("Expected: Total: 10, Count: 1");

// Test 3: Switch with break statements
console.log("\nTest 3: Break statements work correctly");
var num = 2;
var sequence = "";
switch(num) {
    case 1:
        sequence = sequence + "A";
        break;
    case 2:
        sequence = sequence + "B";
        break;
    case 3:
        sequence = sequence + "C";
        break;
}
console.log("Sequence:", sequence);
console.log("Expected: B");

// Test 4: Complex fall-through
console.log("\nTest 4: Complex fall-through");
var type = "medium";
var size = 0;
switch(type) {
    case "small":
        size = size + 1;
    case "medium":
        size = size + 2;
    case "large":
        size = size + 3;
        break;
    default:
        size = -1;
        break;
}
console.log("Size:", size);
console.log("Expected: 5 (2 + 3 from fall-through)");

console.log("\n=== Switch Edge Cases Test Complete ===");