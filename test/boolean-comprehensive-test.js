// Boolean comprehensive test - edge cases and advanced scenarios

console.log("=== Boolean Comprehensive Test ===");

// Test truthy/falsy values in boolean contexts
console.log("--- Truthy/Falsy Tests ---");

// Falsy values
if (!0) console.log("PASS: 0 is falsy");
if (0) console.log("FAIL: 0 is falsy");

if (!"") console.log("PASS: empty string is falsy");
if ("") console.log("FAIL: empty string is falsy");

if (!null) console.log("PASS: null is falsy");
if (null) console.log("FAIL: null is falsy");

if (!undefined) console.log("PASS: undefined is falsy");
if (undefined) console.log("FAIL: undefined is falsy");

if (!false) console.log("PASS: false is falsy");
if (false) console.log("FAIL: false is falsy");

// Truthy values
if (1) console.log("PASS: 1 is truthy");
if (!1) console.log("FAIL: 1 is truthy");

if (-1) console.log("PASS: -1 is truthy");
if (!(-1)) console.log("FAIL: -1 is truthy");

if ("hello") console.log("PASS: non-empty string is truthy");
if (!"hello") console.log("FAIL: non-empty string is truthy");

if ("0") console.log("PASS: string '0' is truthy");
if (!"0") console.log("FAIL: string '0' is truthy");

if ("false") console.log("PASS: string 'false' is truthy");
if (!"false") console.log("FAIL: string 'false' is truthy");

if (true) console.log("PASS: true is truthy");
if (!true) console.log("FAIL: true is truthy");

// Test boolean conversions in comparisons
console.log("--- Boolean Conversion Tests ---");

if (true == 1) console.log("PASS: true == 1");
if (true != 1) console.log("FAIL: true == 1");

if (false == 0) console.log("PASS: false == 0");
if (false != 0) console.log("FAIL: false == 0");

if (true != 2) console.log("PASS: true != 2");
if (true == 2) console.log("FAIL: true != 2");

if (false != 1) console.log("PASS: false != 1");
if (false == 1) console.log("FAIL: false != 1");

// Test strict equality (should not convert)
if (true !== 1) console.log("PASS: true !== 1 (strict)");
if (true === 1) console.log("FAIL: true !== 1 (strict)");

if (false !== 0) console.log("PASS: false !== 0 (strict)");
if (false === 0) console.log("FAIL: false !== 0 (strict)");

// Test boolean in arithmetic operations
console.log("--- Boolean Arithmetic Tests ---");

var trueNum = true + 0;
if (trueNum == 1) console.log("PASS: true + 0 equals 1");
if (trueNum != 1) console.log("FAIL: true + 0 equals 1, got", trueNum);

var falseNum = false + 0;
if (falseNum == 0) console.log("PASS: false + 0 equals 0");
if (falseNum != 0) console.log("FAIL: false + 0 equals 0, got", falseNum);

var boolSum = true + false;
if (boolSum == 1) console.log("PASS: true + false equals 1");
if (boolSum != 1) console.log("FAIL: true + false equals 1, got", boolSum);

var boolMult = true * 5;
if (boolMult == 5) console.log("PASS: true * 5 equals 5");
if (boolMult != 5) console.log("FAIL: true * 5 equals 5, got", boolMult);

var boolDiv = false / 2;
if (boolDiv == 0) console.log("PASS: false / 2 equals 0");
if (boolDiv != 0) console.log("FAIL: false / 2 equals 0, got", boolDiv);

// Test boolean in string concatenation
console.log("--- Boolean String Tests ---");

var trueStr = "Value: " + true;
if (trueStr == "Value: true") console.log("PASS: string concatenation with true");
if (trueStr != "Value: true") console.log("FAIL: string concatenation with true, got", trueStr);

var falseStr = "Value: " + false;
if (falseStr == "Value: false") console.log("PASS: string concatenation with false");
if (falseStr != "Value: false") console.log("FAIL: string concatenation with false, got", falseStr);

// Test boolean assignments and reassignments
console.log("--- Boolean Assignment Tests ---");

var boolVar = true;
if (boolVar == true) console.log("PASS: boolean variable assignment");
if (boolVar != true) console.log("FAIL: boolean variable assignment");

boolVar = false;
if (boolVar == false) console.log("PASS: boolean variable reassignment");
if (boolVar != false) console.log("FAIL: boolean variable reassignment");

boolVar = !boolVar;
if (boolVar == true) console.log("PASS: boolean negation assignment");
if (boolVar != true) console.log("FAIL: boolean negation assignment");

console.log("=== Boolean Comprehensive Test Complete ===");

// UNSUPPORTED LANGUAGE FEATURES DETECTED:
// - Ternary operator (? :) - not implemented
// - Logical operators (&& ||) - not implemented  
// - Function declarations - not implemented
console.log("NOTE: This test has been modified to exclude unsupported language features:");
console.log("  - Ternary operator (condition ? value1 : value2)");
console.log("  - Logical operators (&& ||)");
console.log("  - Function declarations"); 