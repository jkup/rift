// Boolean constructor test

console.log("=== Boolean Constructor Test ===");

// Test basic Boolean constructor calls
var boolTrue1 = Boolean(true);
if (boolTrue1 == true) console.log("PASS: Boolean(true) returns true");
if (boolTrue1 != true) console.log("FAIL: Boolean(true) returns true, got", boolTrue1);

var boolFalse1 = Boolean(false);
if (boolFalse1 == false) console.log("PASS: Boolean(false) returns false");
if (boolFalse1 != false) console.log("FAIL: Boolean(false) returns false, got", boolFalse1);

// Test Boolean constructor with no arguments
var boolEmpty = Boolean();
if (boolEmpty == false) console.log("PASS: Boolean() returns false");
if (boolEmpty != false) console.log("FAIL: Boolean() returns false, got", boolEmpty);

// Test Boolean constructor with numbers
var boolZero = Boolean(0);
if (boolZero == false) console.log("PASS: Boolean(0) returns false");
if (boolZero != false) console.log("FAIL: Boolean(0) returns false, got", boolZero);

var boolOne = Boolean(1);
if (boolOne == true) console.log("PASS: Boolean(1) returns true");
if (boolOne != true) console.log("FAIL: Boolean(1) returns true, got", boolOne);

var boolNegative = Boolean(-1);
if (boolNegative == true) console.log("PASS: Boolean(-1) returns true");
if (boolNegative != true) console.log("FAIL: Boolean(-1) returns true, got", boolNegative);

var boolPositive = Boolean(42);
if (boolPositive == true) console.log("PASS: Boolean(42) returns true");
if (boolPositive != true) console.log("FAIL: Boolean(42) returns true, got", boolPositive);

// Test Boolean constructor with strings
var boolEmptyString = Boolean("");
if (boolEmptyString == false) console.log("PASS: Boolean('') returns false");
if (boolEmptyString != false) console.log("FAIL: Boolean('') returns false, got", boolEmptyString);

var boolString = Boolean("hello");
if (boolString == true) console.log("PASS: Boolean('hello') returns true");
if (boolString != true) console.log("FAIL: Boolean('hello') returns true, got", boolString);

var boolStringZero = Boolean("0");
if (boolStringZero == true) console.log("PASS: Boolean('0') returns true");
if (boolStringZero != true) console.log("FAIL: Boolean('0') returns true, got", boolStringZero);

var boolStringFalse = Boolean("false");
if (boolStringFalse == true) console.log("PASS: Boolean('false') returns true");
if (boolStringFalse != true) console.log("FAIL: Boolean('false') returns true, got", boolStringFalse);

// Test Boolean constructor with undefined and null
var boolUndefined = Boolean(undefined);
if (boolUndefined == false) console.log("PASS: Boolean(undefined) returns false");
if (boolUndefined != false) console.log("FAIL: Boolean(undefined) returns false, got", boolUndefined);

var boolNull = Boolean(null);
if (boolNull == false) console.log("PASS: Boolean(null) returns false");
if (boolNull != false) console.log("FAIL: Boolean(null) returns false, got", boolNull);

// Test return type of Boolean constructor
if (typeof Boolean(true) == "boolean") console.log("PASS: typeof Boolean(true) is 'boolean'");
if (typeof Boolean(true) != "boolean") console.log("FAIL: typeof Boolean(true) is 'boolean', got", typeof Boolean(true));

if (typeof Boolean(false) == "boolean") console.log("PASS: typeof Boolean(false) is 'boolean'");
if (typeof Boolean(false) != "boolean") console.log("FAIL: typeof Boolean(false) is 'boolean', got", typeof Boolean(false));

if (typeof Boolean(1) == "boolean") console.log("PASS: typeof Boolean(1) is 'boolean'");
if (typeof Boolean(1) != "boolean") console.log("FAIL: typeof Boolean(1) is 'boolean', got", typeof Boolean(1));

if (typeof Boolean("hello") == "boolean") console.log("PASS: typeof Boolean('hello') is 'boolean'");
if (typeof Boolean("hello") != "boolean") console.log("FAIL: typeof Boolean('hello') is 'boolean', got", typeof Boolean("hello"));

// Test Boolean constructor with complex expressions
var boolExpression1 = Boolean(2 + 2);
if (boolExpression1 == true) console.log("PASS: Boolean(2 + 2) returns true");
if (boolExpression1 != true) console.log("FAIL: Boolean(2 + 2) returns true, got", boolExpression1);

var boolExpression2 = Boolean(5 - 5);
if (boolExpression2 == false) console.log("PASS: Boolean(5 - 5) returns false");
if (boolExpression2 != false) console.log("FAIL: Boolean(5 - 5) returns false, got", boolExpression2);

// Test Boolean constructor called multiple times
var doubleBool = Boolean(Boolean(true));
if (doubleBool == true) console.log("PASS: Boolean(Boolean(true)) returns true");
if (doubleBool != true) console.log("FAIL: Boolean(Boolean(true)) returns true, got", doubleBool);

var doubleBoolFalse = Boolean(Boolean(false));
if (doubleBoolFalse == false) console.log("PASS: Boolean(Boolean(false)) returns false");
if (doubleBoolFalse != false) console.log("FAIL: Boolean(Boolean(false)) returns false, got", doubleBoolFalse);

console.log("=== Boolean Constructor Test Complete ==="); 