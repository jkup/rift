// Boolean literals test

console.log("=== Boolean Literals Test ===");

// Test basic boolean literals
if (true == true) console.log("PASS: true literal equals true");
if (true != true) console.log("FAIL: true literal equals true");

if (false == false) console.log("PASS: false literal equals false");
if (false != false) console.log("FAIL: false literal equals false");

// Test boolean literals are not equal to each other
if (true != false) console.log("PASS: true is not equal to false");
if (true == false) console.log("FAIL: true is not equal to false");

if (false != true) console.log("PASS: false is not equal to true");
if (false == true) console.log("FAIL: false is not equal to true");

// Test typeof for boolean literals
if (typeof true == "boolean") console.log("PASS: typeof true is 'boolean'");
if (typeof true != "boolean") console.log("FAIL: typeof true is 'boolean', got", typeof true);

if (typeof false == "boolean") console.log("PASS: typeof false is 'boolean'");
if (typeof false != "boolean") console.log("FAIL: typeof false is 'boolean', got", typeof false);

// Test boolean literals in variables
var trueVar = true;
var falseVar = false;

if (trueVar == true) console.log("PASS: true variable assignment");
if (trueVar != true) console.log("FAIL: true variable assignment");

if (falseVar == false) console.log("PASS: false variable assignment");
if (falseVar != false) console.log("FAIL: false variable assignment");

if (typeof trueVar == "boolean") console.log("PASS: typeof true variable is 'boolean'");
if (typeof trueVar != "boolean") console.log("FAIL: typeof true variable is 'boolean'");

if (typeof falseVar == "boolean") console.log("PASS: typeof false variable is 'boolean'");
if (typeof falseVar != "boolean") console.log("FAIL: typeof false variable is 'boolean'");

// Test logical operations with boolean literals
if (!true == false) console.log("PASS: !true equals false");
if (!true != false) console.log("FAIL: !true equals false");

if (!false == true) console.log("PASS: !false equals true");
if (!false != true) console.log("FAIL: !false equals true");

// Test boolean literals in logical AND
if (true && true == true) console.log("PASS: true && true equals true");
if (true && true != true) console.log("FAIL: true && true equals true");

if (true && false == false) console.log("PASS: true && false equals false");
if (true && false != false) console.log("FAIL: true && false equals false");

if (false && true == false) console.log("PASS: false && true equals false");
if (false && true != false) console.log("FAIL: false && true equals false");

if (false && false == false) console.log("PASS: false && false equals false");
if (false && false != false) console.log("FAIL: false && false equals false");

// Test boolean literals in logical OR
if (true || true == true) console.log("PASS: true || true equals true");
if (true || true != true) console.log("FAIL: true || true equals true");

if (true || false == true) console.log("PASS: true || false equals true");
if (true || false != true) console.log("FAIL: true || false equals true");

if (false || true == true) console.log("PASS: false || true equals true");
if (false || true != true) console.log("FAIL: false || true equals true");

if (false || false == false) console.log("PASS: false || false equals false");
if (false || false != false) console.log("FAIL: false || false equals false");

console.log("=== Boolean Literals Test Complete ==="); 