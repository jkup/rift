// Test edge cases for template literal parsing
console.log("=== Template Literal Edge Cases Test ===");

// Test 1: Template starts with expression
console.log("Test 1: Starts with expression");
var a = "Start";
var result1 = `${a} text`;
console.log("Result:", result1);
console.log("Expected: Start text");

// Test 2: Template ends with expression  
console.log("\nTest 2: Ends with expression");
var b = "End";
var result2 = `text ${b}`;
console.log("Result:", result2);
console.log("Expected: text End");

// Test 3: Only expressions, no text
console.log("\nTest 3: Only expressions");
var x = 1;
var y = 2;
var z = 3;
var result3 = `${x}${y}${z}`;
console.log("Result:", result3);
console.log("Expected: 123");

// Test 4: Single expression only
console.log("\nTest 4: Single expression");
var single = "solo";
var result4 = `${single}`;
console.log("Result:", result4);
console.log("Expected: solo");

// Test 5: Many consecutive expressions
console.log("\nTest 5: Many consecutive expressions");
var result5 = `${1}${2}${3}${4}${5}`;
console.log("Result:", result5);
console.log("Expected: 12345");

// Test 6: Complex expressions consecutive
console.log("\nTest 6: Complex consecutive expressions");
var obj = {name: "test"};
var arr = [1, 2, 3];
var result6 = `${obj.name}${arr.length}${x + y}`;
console.log("Result:", result6);
console.log("Expected: test33");

console.log("\n=== Template Literal Edge Cases Test Complete ===");