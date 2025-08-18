// Comprehensive Template Literals Test
// Tests all major template literal functionality

console.log("=== Template Literals Comprehensive Test ===");

// Test 1: Simple template without expressions
console.log("Test 1: Simple template without expressions");
var simple = `Hello World`;
console.log("Simple template result:", simple);
if (simple === "Hello World") {
    console.log("PASS: Simple template works");
} else {
    console.log("FAIL: Simple template failed");
}

// Test 2: Single expression interpolation
console.log("\nTest 2: Single expression interpolation");
var name = "Alice";
var greeting = `Hello ${name}!`;
console.log("Single interpolation result:", greeting);
if (greeting === "Hello Alice!") {
    console.log("PASS: Single interpolation works");
} else {
    console.log("FAIL: Single interpolation failed");
}

// Test 3: Multiple expressions
console.log("\nTest 3: Multiple expressions");
var x = 5;
var y = 10;
var math = `${x} + ${y} = ${x + y}`;
console.log("Multiple expressions result:", math);
if (math === "5 + 10 = 15") {
    console.log("PASS: Multiple expressions work");
} else {
    console.log("FAIL: Multiple expressions failed");
}

// Test 4: Multi-line template
console.log("\nTest 4: Multi-line template");
var multiline = `Line 1
Line 2
Line 3`;
console.log("Multi-line result:");
console.log(multiline);
if (multiline.indexOf("Line 1") >= 0 && multiline.indexOf("Line 2") >= 0) {
    console.log("PASS: Multi-line template works");
} else {
    console.log("FAIL: Multi-line template failed");
}

// Test 5: Expression with operations
console.log("\nTest 5: Expression with operations");
var a = 3;
var b = 4;
var operation = `The result of ${a} * ${b} is ${a * b}`;
console.log("Operation result:", operation);
if (operation === "The result of 3 * 4 is 12") {
    console.log("PASS: Expression operations work");
} else {
    console.log("FAIL: Expression operations failed");
}

// Test 6: Object property access in template
console.log("\nTest 6: Object property access");
var person = { name: "Bob", age: 25 };
var personInfo = `Name: ${person.name}, Age: ${person.age}`;
console.log("Object property result:", personInfo);
if (personInfo === "Name: Bob, Age: 25") {
    console.log("PASS: Object property access works");
} else {
    console.log("FAIL: Object property access failed");
}

// Test 7: Boolean values in template
console.log("\nTest 7: Boolean values");
var isTrue = true;
var isFalse = false;
var booleans = `True: ${isTrue}, False: ${isFalse}`;
console.log("Boolean result:", booleans);
if (booleans === "True: true, False: false") {
    console.log("PASS: Boolean values work");
} else {
    console.log("FAIL: Boolean values failed");
}

// Test 8: Number conversion
console.log("\nTest 8: Number conversion");
var num = 42.5;
var numberTemplate = `The number is ${num}`;
console.log("Number result:", numberTemplate);
if (numberTemplate === "The number is 42.5") {
    console.log("PASS: Number conversion works");
} else {
    console.log("FAIL: Number conversion failed");
}

// Test 9: Null and undefined handling
console.log("\nTest 9: Null and undefined handling");
var nullVar = null;
var undefinedVar = undefined;
var nullUndef = `Null: ${nullVar}, Undefined: ${undefinedVar}`;
console.log("Null/undefined result:", nullUndef);
if (nullUndef.indexOf("null") >= 0 && nullUndef.indexOf("undefined") >= 0) {
    console.log("PASS: Null/undefined handling works");
} else {
    console.log("FAIL: Null/undefined handling failed");
}

// Test 10: Empty expression (edge case)
console.log("\nTest 10: Template with just expression");
var onlyExpression = `${42}`;
console.log("Only expression result:", onlyExpression);
if (onlyExpression === "42") {
    console.log("PASS: Only expression works");
} else {
    console.log("FAIL: Only expression failed");
}

console.log("\n=== Template Literals Comprehensive Test Complete ===");
