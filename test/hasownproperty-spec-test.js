// Test Object.prototype.hasOwnProperty() ECMAScript spec compliance
console.log("=== hasOwnProperty Spec Compliance Test ===");

// Test 1: Own properties should return true
console.log("\n--- Testing Own Properties ---");
var obj = {name: "test", age: 25};
console.log("obj.hasOwnProperty('name'):", obj.hasOwnProperty('name'));  // Should be true
console.log("obj.hasOwnProperty('age'):", obj.hasOwnProperty('age'));    // Should be true
console.log("Expected: true, true");

// Test 2: Non-existent properties should return false  
console.log("\n--- Testing Non-existent Properties ---");
console.log("obj.hasOwnProperty('missing'):", obj.hasOwnProperty('missing')); // Should be false
console.log("obj.hasOwnProperty('toString'):", obj.hasOwnProperty('toString')); // Should be false (inherited)
console.log("Expected: false, false");

// Test 3: Properties added at runtime
console.log("\n--- Testing Runtime Properties ---");
obj.newProp = "added";
console.log("obj.newProp =", obj.newProp);  // Should work (inherited property access)
console.log("obj.hasOwnProperty('newProp'):", obj.hasOwnProperty('newProp')); // Should be true (own property)
console.log("Expected: true");

// Test 4: Method properties
console.log("\n--- Testing Method Properties ---");
obj.myMethod = function() { return "hello"; };
console.log("obj.hasOwnProperty('myMethod'):", obj.hasOwnProperty('myMethod')); // Should be true
console.log("Expected: true");

// Test 5: Testing on different object types
console.log("\n--- Testing Different Object Types ---");
var arr = [1, 2, 3];
console.log("Array hasOwnProperty('0'):", arr.hasOwnProperty('0'));     // Should be true (own property)
console.log("Array hasOwnProperty('length'):", arr.hasOwnProperty('length')); // Should be true (own property)
console.log("Array hasOwnProperty('push'):", arr.hasOwnProperty('push')); // Should be false (inherited from Array.prototype)
console.log("Expected: true, true, false");

// Test 6: Object with explicit properties vs inherited
console.log("\n--- Testing Inheritance Distinction ---");
var child = {};
child.ownProp = "mine";
// toString, valueOf etc. are inherited but not own properties
console.log("child.hasOwnProperty('ownProp'):", child.hasOwnProperty('ownProp')); // Should be true
console.log("child.hasOwnProperty('toString'):", child.hasOwnProperty('toString')); // Should be false
console.log("child.hasOwnProperty('valueOf'):", child.hasOwnProperty('valueOf')); // Should be false
console.log("Expected: true, false, false");

// Test 7: Edge cases
console.log("\n--- Testing Edge Cases ---");
var emptyObj = {};
console.log("empty.hasOwnProperty('constructor'):", emptyObj.hasOwnProperty('constructor')); // Should be false
console.log("empty.hasOwnProperty(''):", emptyObj.hasOwnProperty('')); // Should be false
console.log("Expected: false, false");

console.log("\n=== hasOwnProperty Spec Test Complete ==="); 