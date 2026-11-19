// Comprehensive test for Number constructor and methods
// Following ECMAScript specification: https://tc39.es/ecma262/#sec-number-objects

console.log("=== Number Constructor & Static Properties Test ===");

// ===== Constructor Tests =====
console.log("\n--- Number Constructor ---");

// Number as function (converts to number)
console.log("Number(): " + Number());
console.log("Expected: 0");

console.log("Number(42): " + Number(42));
console.log("Expected: 42");

console.log("Number('123'): " + Number("123"));
console.log("Expected: 123");

console.log("Number(true): " + Number(true));
console.log("Expected: 1");

console.log("Number(false): " + Number(false));
console.log("Expected: 0");

// Number as constructor (creates Number object)
var numObj = new Number(42);
console.log("\nnew Number(42):");
console.log("  typeof: " + typeof numObj);
console.log("  Expected: object");
console.log("  valueOf(): " + numObj.valueOf());
console.log("  Expected: 42");
console.log("  toString(): " + numObj.toString());
console.log("  Expected: 42");

// ===== Static Properties =====
console.log("\n--- Static Properties (Constants) ---");

console.log("Number.NaN: " + Number.NaN);
console.log("Expected: NaN");

console.log("Number.POSITIVE_INFINITY: " + Number.POSITIVE_INFINITY);
console.log("Expected: Infinity");

console.log("Number.NEGATIVE_INFINITY: " + Number.NEGATIVE_INFINITY);
console.log("Expected: -Infinity");

console.log("Number.MAX_VALUE: " + Number.MAX_VALUE);
console.log("Expected: 1.7976931348623157e+308");

console.log("Number.MIN_VALUE: " + Number.MIN_VALUE);
console.log("Expected: 5e-324");

console.log("Number.MAX_SAFE_INTEGER: " + Number.MAX_SAFE_INTEGER);
console.log("Expected: 9007199254740991");

console.log("Number.MIN_SAFE_INTEGER: " + Number.MIN_SAFE_INTEGER);
console.log("Expected: -9007199254740991");

console.log("Number.EPSILON: " + Number.EPSILON);
console.log("Expected: 2.220446049250313e-16");

// ===== Static Methods =====
console.log("\n--- Number.isNaN() ---");

console.log("Number.isNaN(NaN): " + Number.isNaN(NaN));
console.log("Expected: true");

console.log("Number.isNaN(Number.NaN): " + Number.isNaN(Number.NaN));
console.log("Expected: true");

console.log("Number.isNaN(0 / 0): " + Number.isNaN(0 / 0));
console.log("Expected: true");

console.log("Number.isNaN(42): " + Number.isNaN(42));
console.log("Expected: false");

console.log("Number.isNaN('NaN'): " + Number.isNaN("NaN"));
console.log("Expected: false (string, not number type)");

console.log("Number.isNaN(undefined): " + Number.isNaN(undefined));
console.log("Expected: false (not number type)");

console.log("\n--- Number.isFinite() ---");

console.log("Number.isFinite(42): " + Number.isFinite(42));
console.log("Expected: true");

console.log("Number.isFinite(0): " + Number.isFinite(0));
console.log("Expected: true");

console.log("Number.isFinite(-1.5): " + Number.isFinite(-1.5));
console.log("Expected: true");

console.log("Number.isFinite(Infinity): " + Number.isFinite(Infinity));
console.log("Expected: false");

console.log("Number.isFinite(-Infinity): " + Number.isFinite(-Infinity));
console.log("Expected: false");

console.log("Number.isFinite(NaN): " + Number.isFinite(NaN));
console.log("Expected: false");

console.log("Number.isFinite('42'): " + Number.isFinite("42"));
console.log("Expected: false (string, not number type)");

console.log("\n--- Number.isInteger() ---");

console.log("Number.isInteger(42): " + Number.isInteger(42));
console.log("Expected: true");

console.log("Number.isInteger(0): " + Number.isInteger(0));
console.log("Expected: true");

console.log("Number.isInteger(-100): " + Number.isInteger(-100));
console.log("Expected: true");

console.log("Number.isInteger(42.0): " + Number.isInteger(42.0));
console.log("Expected: true");

console.log("Number.isInteger(42.5): " + Number.isInteger(42.5));
console.log("Expected: false");

console.log("Number.isInteger(NaN): " + Number.isInteger(NaN));
console.log("Expected: false");

console.log("Number.isInteger(Infinity): " + Number.isInteger(Infinity));
console.log("Expected: false");

console.log("\n--- Number.isSafeInteger() ---");

console.log("Number.isSafeInteger(42): " + Number.isSafeInteger(42));
console.log("Expected: true");

console.log(
  "Number.isSafeInteger(9007199254740991): " +
    Number.isSafeInteger(9007199254740991)
);
console.log("Expected: true (MAX_SAFE_INTEGER)");

console.log(
  "Number.isSafeInteger(-9007199254740991): " +
    Number.isSafeInteger(-9007199254740991)
);
console.log("Expected: true (MIN_SAFE_INTEGER)");

console.log(
  "Number.isSafeInteger(9007199254740992): " +
    Number.isSafeInteger(9007199254740992)
);
console.log("Expected: false (exceeds MAX_SAFE_INTEGER)");

console.log("Number.isSafeInteger(42.5): " + Number.isSafeInteger(42.5));
console.log("Expected: false (not an integer)");

console.log("\n--- Number.parseFloat() ---");

console.log("Number.parseFloat('123.45'): " + Number.parseFloat("123.45"));
console.log("Expected: 123.45");

console.log("Number.parseFloat('  3.14  '): " + Number.parseFloat("  3.14  "));
console.log("Expected: 3.14");

console.log("Number.parseFloat('-42.5'): " + Number.parseFloat("-42.5"));
console.log("Expected: -42.5");

console.log("Number.parseFloat('123abc'): " + Number.parseFloat("123abc"));
console.log("Expected: 123");

console.log("\n--- Number.parseInt() ---");

console.log("Number.parseInt('123'): " + Number.parseInt("123"));
console.log("Expected: 123");

console.log("Number.parseInt('  42  '): " + Number.parseInt("  42  "));
console.log("Expected: 42");

console.log("Number.parseInt('101', 2): " + Number.parseInt("101", 2));
console.log("Expected: 5");

console.log("Number.parseInt('FF', 16): " + Number.parseInt("FF", 16));
console.log("Expected: 255");

console.log("Number.parseInt('10', 8): " + Number.parseInt("10", 8));
console.log("Expected: 8");

// ===== Prototype Methods =====
console.log("\n--- Number.prototype.toString() ---");

var num = 42;
console.log("(42).toString(): " + num.toString());
console.log("Expected: 42");

console.log("(42).toString(2): " + num.toString(2));
console.log("Expected: 101010 (binary)");

console.log("(42).toString(16): " + num.toString(16));
console.log("Expected: 2a (hexadecimal)");

console.log("(255).toString(16): " + (255).toString(16));
console.log("Expected: ff");

console.log("(NaN).toString(): " + NaN.toString());
console.log("Expected: NaN");

console.log("(Infinity).toString(): " + Infinity.toString());
console.log("Expected: Infinity");

console.log("\n--- Number.prototype.valueOf() ---");

var numObj2 = new Number(100);
console.log("new Number(100).valueOf(): " + numObj2.valueOf());
console.log("Expected: 100");

console.log("(42).valueOf(): " + (42).valueOf());
console.log("Expected: 42");

console.log("\n--- Number.prototype.toFixed() ---");

console.log("(123.456).toFixed(): " + (123.456).toFixed());
console.log("Expected: 123");

console.log("(123.456).toFixed(0): " + (123.456).toFixed(0));
console.log("Expected: 123");

console.log("(123.456).toFixed(1): " + (123.456).toFixed(1));
console.log("Expected: 123.5");

console.log("(123.456).toFixed(2): " + (123.456).toFixed(2));
console.log("Expected: 123.46");

console.log("(123.456).toFixed(5): " + (123.456).toFixed(5));
console.log("Expected: 123.45600");

console.log("\n--- Number.prototype.toExponential() ---");

console.log("(123456).toExponential(): " + (123456).toExponential());
console.log("Expected: 1.23456e+05 or similar");

console.log("(123456).toExponential(2): " + (123456).toExponential(2));
console.log("Expected: 1.23e+05 or similar");

console.log("(0.000123).toExponential(): " + (0.000123).toExponential());
console.log("Expected: 1.23e-04 or similar");

console.log("\n--- Number.prototype.toPrecision() ---");

console.log("(123.456).toPrecision(): " + (123.456).toPrecision());
console.log("Expected: 123.456");

console.log("(123.456).toPrecision(2): " + (123.456).toPrecision(2));
console.log("Expected: 1.2e+2 or similar");

console.log("(123.456).toPrecision(4): " + (123.456).toPrecision(4));
console.log("Expected: 123.5");

console.log("(123.456).toPrecision(6): " + (123.456).toPrecision(6));
console.log("Expected: 123.456");

// ===== Edge Cases & Special Values =====
console.log("\n--- Edge Cases ---");

console.log("Number(null): " + Number(null));
console.log("Expected: 0");

console.log("Number(undefined): " + Number(undefined));
console.log("Expected: NaN");

console.log("Number(''): " + Number(""));
console.log("Expected: 0");

console.log("Number('   '): " + Number("   "));
console.log("Expected: 0");

console.log("Number('abc'): " + Number("abc"));
console.log("Expected: NaN");

console.log("\n--- Number Object vs Primitive ---");

var prim = 42;
var obj = new Number(42);

console.log("Primitive typeof: " + typeof prim);
console.log("Expected: number");

console.log("Object typeof: " + typeof obj);
console.log("Expected: object");

console.log("Primitive value: " + prim);
console.log("Expected: 42");

console.log("Object value: " + obj.valueOf());
console.log("Expected: 42");

console.log("\n=== Number Tests Complete ===");
console.log("✅ All Number constructor, static properties, and methods tested");
console.log(
  "📊 Coverage: Constructor, 8 constants, 6 static methods, 5 prototype methods"
);
