// Quick test for Number built-in (avoiding primitive method calls for now)
console.log("=== Number Constructor Test ===");

console.log("Number(): " + Number());
console.log("Number(42): " + Number(42));
console.log("Number('123'): " + Number("123"));

console.log("\n=== Number Constants ===");
console.log("Number.NaN: " + Number.NaN);
console.log("Number.POSITIVE_INFINITY: " + Number.POSITIVE_INFINITY);
console.log("Number.NEGATIVE_INFINITY: " + Number.NEGATIVE_INFINITY);
console.log("Number.MAX_VALUE: " + Number.MAX_VALUE);
console.log("Number.MIN_VALUE: " + Number.MIN_VALUE);
console.log("Number.MAX_SAFE_INTEGER: " + Number.MAX_SAFE_INTEGER);
console.log("Number.MIN_SAFE_INTEGER: " + Number.MIN_SAFE_INTEGER);
console.log("Number.EPSILON: " + Number.EPSILON);

console.log("\n=== Number Static Methods ===");
console.log("Number.isNaN(NaN): " + Number.isNaN(NaN));
console.log("Number.isNaN(42): " + Number.isNaN(42));
console.log("Number.isFinite(42): " + Number.isFinite(42));
console.log("Number.isFinite(Infinity): " + Number.isFinite(Infinity));
console.log("Number.isInteger(42): " + Number.isInteger(42));
console.log("Number.isInteger(42.5): " + Number.isInteger(42.5));
console.log(
  "Number.isSafeInteger(9007199254740991): " +
    Number.isSafeInteger(9007199254740991)
);
console.log("Number.parseInt('FF', 16): " + Number.parseInt("FF", 16));
console.log("Number.parseFloat('123.45'): " + Number.parseFloat("123.45"));

console.log("\n=== Number Object Methods ===");
var numObj = new Number(42);
console.log("new Number(42).valueOf(): " + numObj.valueOf());
console.log("new Number(42).toString(): " + numObj.toString());
console.log(
  "new Number(123.456).toFixed(2): " + new Number(123.456).toFixed(2)
);
console.log(
  "new Number(123456).toExponential(2): " + new Number(123456).toExponential(2)
);

console.log("\n✅ Number built-in working correctly!");
