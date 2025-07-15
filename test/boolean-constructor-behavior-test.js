// Test Boolean constructor behavior
console.log("=== Boolean Constructor Behavior Test ===");

// Test 1: Boolean() as function call should return primitive
console.log("Test 1: Boolean() as function call");
var result1 = Boolean(true);
console.log("Boolean(true) =", result1);
console.log("typeof Boolean(true) =", typeof result1);

var result2 = Boolean(false);
console.log("Boolean(false) =", result2);
console.log("typeof Boolean(false) =", typeof result2);

var result3 = Boolean(0);
console.log("Boolean(0) =", result3);
console.log("typeof Boolean(0) =", typeof result3);

var result4 = Boolean(1);
console.log("Boolean(1) =", result4);
console.log("typeof Boolean(1) =", typeof result4);

console.log();

// Test 2: new Boolean() should return object
console.log("Test 2: new Boolean() as constructor");
var obj1 = new Boolean(true);
console.log("new Boolean(true) =", obj1);
console.log("typeof new Boolean(true) =", typeof obj1);

var obj2 = new Boolean(false);
console.log("new Boolean(false) =", obj2);
console.log("typeof new Boolean(false) =", typeof obj2);

// Test 3: Boolean object methods
console.log();
console.log("Test 3: Boolean object methods");
var boolObj = new Boolean(true);
console.log("boolObj.toString() =", boolObj.toString());
console.log("boolObj.valueOf() =", boolObj.valueOf());

console.log();
console.log("=== Summary ===");
console.log("Boolean(true) should be primitive:", typeof Boolean(true) === "boolean");
console.log("new Boolean(true) should be object:", typeof new Boolean(true) === "object"); 