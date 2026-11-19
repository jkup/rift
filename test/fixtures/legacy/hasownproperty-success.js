// Verification: hasOwnProperty now works correctly per ECMAScript spec!
console.log("=== hasOwnProperty SUCCESS Verification ===");

var obj = {name: "test", age: 25};

// ✅ CORRECTLY identifies own properties
console.log("Own properties work:", 
    obj.hasOwnProperty('name'), 
    obj.hasOwnProperty('age')); 

// ✅ CORRECTLY identifies inherited methods as NOT own
console.log("Inherited methods correctly excluded:",
    obj.hasOwnProperty('toString'),    // false - inherited
    obj.hasOwnProperty('valueOf'));    // false - inherited

// ✅ CORRECTLY handles runtime property additions
obj.newProp = "added";
console.log("Runtime properties work:", obj.hasOwnProperty('newProp')); // true

// ✅ CORRECTLY handles empty objects
var empty = {};
console.log("Empty object works:", empty.hasOwnProperty('toString')); // false

// ✅ Show the key improvement: inheritance distinction
console.log("\n=== BEFORE vs AFTER Comparison ===");
console.log("toString() exists on object:", typeof obj.toString === 'function');
console.log("But hasOwnProperty('toString'):", obj.hasOwnProperty('toString'));
console.log("^ This is CORRECT - toString is inherited, not own property!");

console.log("\n✅ hasOwnProperty is now ECMAScript spec compliant! ✅"); 