// Switch Statements Test
console.log("=== Switch Statements Test ===");

// Test 1: Basic switch with exact matches
console.log("Test 1: Basic switch");
var x = 2;
var result1;
switch(x) {
    case 1:
        result1 = "one";
        break;
    case 2:
        result1 = "two";
        break;
    case 3:
        result1 = "three";
        break;
    default:
        result1 = "other";
        break;
}
console.log("Result:", result1);
console.log("Expected: two");

// Test 2: Switch with string values
console.log("\nTest 2: String switch");
var color = "blue";
var message;
switch(color) {
    case "red":
        message = "Stop";
        break;
    case "yellow":
        message = "Caution";
        break;
    case "blue":
        message = "Go";
        break;
    default:
        message = "Unknown";
        break;
}
console.log("Result:", message);
console.log("Expected: Go");

// Test 3: Switch with fall-through (no break)
console.log("\nTest 3: Fall-through behavior");
var grade = "B";
var description;
switch(grade) {
    case "A":
    case "B":
        description = "Excellent";
        break;
    case "C":
        description = "Good";
        break;
    default:
        description = "Needs improvement";
        break;
}
console.log("Result:", description);
console.log("Expected: Excellent");

// Test 4: Default case
console.log("\nTest 4: Default case");
var unknown = 999;
var category;
switch(unknown) {
    case 1:
        category = "first";
        break;
    case 2:
        category = "second";
        break;
    default:
        category = "unknown";
        break;
}
console.log("Result:", category);
console.log("Expected: unknown");

// Test 5: No default case, no match
console.log("\nTest 5: No match, no default");
var noMatch = 5;
var result5 = "initial";
switch(noMatch) {
    case 1:
        result5 = "found";
        break;
    case 2:
        result5 = "found";
        break;
}
console.log("Result:", result5);
console.log("Expected: initial (should remain unchanged)");

console.log("\n=== Switch Statements Test Complete ===");