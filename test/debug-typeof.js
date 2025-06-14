// typeof operator tests

// Test basic typeof operations
if (typeof 42 == "number") console.log("PASS: typeof 42 returns number");
if (typeof 42 != "number") console.log("FAIL: typeof 42 returns number");

if (typeof "hello" == "string")
  console.log("PASS: typeof string returns string");
if (typeof "hello" != "string")
  console.log("FAIL: typeof string returns string");

if (typeof true == "boolean") console.log("PASS: typeof true returns boolean");
if (typeof true != "boolean") console.log("FAIL: typeof true returns boolean");

if (typeof undefined == "undefined")
  console.log("PASS: typeof undefined returns undefined");
if (typeof undefined != "undefined")
  console.log("FAIL: typeof undefined returns undefined");

if (typeof null == "object") console.log("PASS: typeof null returns object");
if (typeof null != "object") console.log("FAIL: typeof null returns object");

// Test other unary operators for comparison
if (!true == false) console.log("PASS: Logical NOT works");
if (!true != false) console.log("FAIL: Logical NOT works");

if (-5 == -5) console.log("PASS: Unary minus works");
if (-5 != -5) console.log("FAIL: Unary minus works");
