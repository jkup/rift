// Unary Operators Test Suite

// Test 1: Unary Plus (+)
if (+5 == 5) console.log("PASS: Unary plus with positive number");
if (+5 != 5) console.log("FAIL: Unary plus with positive number");

if (+-3 == -3) console.log("PASS: Unary plus with negative number");
if (+-3 != -3) console.log("FAIL: Unary plus with negative number");

if (+0 == 0) console.log("PASS: Unary plus with zero");
if (+0 != 0) console.log("FAIL: Unary plus with zero");

// Test 2: Unary Minus (-)
if (-5 == -5) console.log("PASS: Unary minus with positive number");
if (-5 != -5) console.log("FAIL: Unary minus with positive number");

if (-(-3) == 3) console.log("PASS: Unary minus with negative number");
if (-(-3) != 3) console.log("FAIL: Unary minus with negative number");

if (-0 == 0) console.log("PASS: Unary minus with zero");
if (-0 != 0) console.log("FAIL: Unary minus with zero");

// Test 3: Logical NOT (!)
if (!true == false) console.log("PASS: Logical NOT with true");
if (!true != false) console.log("FAIL: Logical NOT with true");

if (!false == true) console.log("PASS: Logical NOT with false");
if (!false != true) console.log("FAIL: Logical NOT with false");

if (!0 == true) console.log("PASS: Logical NOT with 0");
if (!0 != true) console.log("FAIL: Logical NOT with 0");

if (!1 == false) console.log("PASS: Logical NOT with 1");
if (!1 != false) console.log("FAIL: Logical NOT with 1");

if (!42 == false) console.log("PASS: Logical NOT with positive number");
if (!42 != false) console.log("FAIL: Logical NOT with positive number");

// Test 4: Double Logical NOT (!!)
if (!!true == true) console.log("PASS: Double logical NOT with true");
if (!!true != true) console.log("FAIL: Double logical NOT with true");

if (!!false == false) console.log("PASS: Double logical NOT with false");
if (!!false != false) console.log("FAIL: Double logical NOT with false");

if (!!0 == false) console.log("PASS: Double logical NOT with 0");
if (!!0 != false) console.log("FAIL: Double logical NOT with 0");

if (!!1 == true) console.log("PASS: Double logical NOT with 1");
if (!!1 != true) console.log("FAIL: Double logical NOT with 1");

if (!!42 == true) console.log("PASS: Double logical NOT with positive number");
if (!!42 != true) console.log("FAIL: Double logical NOT with positive number");

// Test 5: Bitwise NOT (~)
if (~0 == -1) console.log("PASS: Bitwise NOT with 0");
if (~0 != -1) console.log("FAIL: Bitwise NOT with 0");

if (~1 == -2) console.log("PASS: Bitwise NOT with 1");
if (~1 != -2) console.log("FAIL: Bitwise NOT with 1");

if (~5 == -6) console.log("PASS: Bitwise NOT with 5");
if (~5 != -6) console.log("FAIL: Bitwise NOT with 5");

if (~-1 == 0) console.log("PASS: Bitwise NOT with -1");
if (~-1 != 0) console.log("FAIL: Bitwise NOT with -1");

if (~42 == -43) console.log("PASS: Bitwise NOT with 42");
if (~42 != -43) console.log("FAIL: Bitwise NOT with 42");

// Test 6: typeof operator
if (typeof 42 == "number") console.log("PASS: typeof number");
if (typeof 42 != "number") console.log("FAIL: typeof number");

if (typeof true == "boolean") console.log("PASS: typeof true");
if (typeof true != "boolean") console.log("FAIL: typeof true");

if (typeof false == "boolean") console.log("PASS: typeof false");
if (typeof false != "boolean") console.log("FAIL: typeof false");

if (typeof null == "object") console.log("PASS: typeof null");
if (typeof null != "object") console.log("FAIL: typeof null");

if (typeof undefined == "undefined") console.log("PASS: typeof undefined");
if (typeof undefined != "undefined") console.log("FAIL: typeof undefined");

// Test 7: typeof with undeclared variables
if (typeof undeclaredVariable == "undefined")
  console.log("PASS: typeof undeclared variable");
if (typeof undeclaredVariable != "undefined")
  console.log("FAIL: typeof undeclared variable");

if (typeof nonExistent == "undefined")
  console.log("PASS: typeof non-existent variable");
if (typeof nonExistent != "undefined")
  console.log("FAIL: typeof non-existent variable");
