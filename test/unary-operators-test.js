// Unary Operators Test Suite
// This file tests all implemented unary operators

// Test 1: Unary Plus (+)
assertEqual(+5, 5, "Unary plus with positive number");
assertEqual(+-3, -3, "Unary plus with negative number");
assertEqual(+0, 0, "Unary plus with zero");
var x = 42;
assertEqual(+x, 42, "Unary plus with variable");

// Test 2: Unary Minus (-)
assertEqual(-5, -5, "Unary minus with positive number");
assertEqual(-(-3), 3, "Unary minus with negative number");
assertEqual(-0, 0, "Unary minus with zero");
var y = 42;
assertEqual(-y, -42, "Unary minus with variable");

// Test 3: Logical NOT (!)
assertEqual(!true, false, "Logical NOT with true");
assertEqual(!false, true, "Logical NOT with false");
assertEqual(!0, true, "Logical NOT with 0");
assertEqual(!1, false, "Logical NOT with 1");
assertEqual(!42, false, "Logical NOT with positive number");
var z = true;
assertEqual(!z, false, "Logical NOT with variable");

// Test 4: Double Logical NOT (!!)
assertEqual(!!true, true, "Double logical NOT with true");
assertEqual(!!false, false, "Double logical NOT with false");
assertEqual(!!0, false, "Double logical NOT with 0");
assertEqual(!!1, true, "Double logical NOT with 1");
assertEqual(!!42, true, "Double logical NOT with positive number");

// Test 5: Bitwise NOT (~)
assertEqual(~0, -1, "Bitwise NOT with 0");
assertEqual(~1, -2, "Bitwise NOT with 1");
assertEqual(~5, -6, "Bitwise NOT with 5");
assertEqual(~-1, 0, "Bitwise NOT with -1");
assertEqual(~42, -43, "Bitwise NOT with 42");

// Test 6: typeof operator
assertEqual(typeof 42, "number", "typeof number");
assertEqual(typeof true, "boolean", "typeof true");
assertEqual(typeof false, "boolean", "typeof false");
assertEqual(typeof null, "object", "typeof null");
assertEqual(typeof undefined, "undefined", "typeof undefined");
var str = "hello";
assertEqual(typeof str, "string", "typeof string variable");
var num = 123;
assertEqual(typeof num, "number", "typeof number variable");
var bool = false;
assertEqual(typeof bool, "boolean", "typeof boolean variable");

// Test 7: typeof with undeclared variables
assertEqual(
  typeof undeclaredVariable,
  "undefined",
  "typeof undeclared variable"
);
assertEqual(typeof nonExistent, "undefined", "typeof non-existent variable");

// Test 8: Complex nested expressions
assertEqual(-(-(-5)), -5, "Triple nested unary minus");
assertEqual(+(+(+3)), 3, "Triple nested unary plus");
assertEqual(!!!false, true, "Triple logical NOT with false");
assertEqual(!!!true, false, "Triple logical NOT with true");

// Test 9: Mixed operators
assertEqual(!+0, true, "Logical NOT of unary plus zero");
assertEqual(!-1, false, "Logical NOT of unary minus one");
assertEqual(+-5, -5, "Unary plus of unary minus");
assertEqual(-+7, -7, "Unary minus of unary plus");

// Test 10: typeof with expressions
assertEqual(typeof (5 + 3), "number", "typeof addition expression");
assertEqual(typeof (true == false), "boolean", "typeof comparison expression");
assertEqual(typeof -42, "number", "typeof unary minus expression");
assertEqual(typeof !true, "boolean", "typeof logical NOT expression");
