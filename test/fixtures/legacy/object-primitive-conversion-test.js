// Test Object constructor primitive-to-object conversion
console.log("=== Object Primitive Conversion Test ===");

// Test 1: String primitive to String object
console.log("\n--- Testing String Conversion ---");
var stringObj = Object("hello");
console.log("Object('hello'):");
console.log("  Type:", typeof stringObj);
console.log("  toString():", stringObj.toString());
console.log("  valueOf():", stringObj.valueOf());
console.log("  charAt(1):", stringObj.charAt(1));

// Test 2: Boolean primitive to Boolean object  
console.log("\n--- Testing Boolean Conversion ---");
var boolObj = Object(true);
console.log("Object(true):");
console.log("  Type:", typeof boolObj);
console.log("  toString():", boolObj.toString());
console.log("  valueOf():", boolObj.valueOf());

var boolObjFalse = Object(false);
console.log("Object(false):");
console.log("  Type:", typeof boolObjFalse);
console.log("  toString():", boolObjFalse.toString());
console.log("  valueOf():", boolObjFalse.valueOf());

// Test 3: Number primitive to Number object
console.log("\n--- Testing Number Conversion ---");
var numObj = Object(42);
console.log("Object(42):");
console.log("  Type:", typeof numObj);
console.log("  toString():", numObj.toString());
console.log("  valueOf():", numObj.valueOf());

var numObjFloat = Object(3.14);
console.log("Object(3.14):");
console.log("  Type:", typeof numObjFloat);
console.log("  toString():", numObjFloat.toString());
console.log("  valueOf():", numObjFloat.valueOf());

// Test 4: null/undefined to plain object
console.log("\n--- Testing null/undefined Conversion ---");
var nullObj = Object(null);
console.log("Object(null):");
console.log("  Type:", typeof nullObj);

// Test 5: Existing object should return same object
console.log("\n--- Testing Object Pass-through ---");
var existingObj = {name: "test"};
var passedObj = Object(existingObj);
console.log("Object(existingObj):");
console.log("  Type:", typeof passedObj);
console.log("  Same object:", existingObj === passedObj);

// Test 6: Empty Object() call
console.log("\n--- Testing Empty Object() ---");
var emptyObj = Object();
console.log("Object():");
console.log("  Type:", typeof emptyObj);

console.log("\n=== Object Conversion Test Complete ==="); 