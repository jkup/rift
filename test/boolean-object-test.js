// Boolean object test (new Boolean())

console.log("=== Boolean Object Test ===");

// Test basic Boolean object creation
var boolObjTrue = new Boolean(true);
var boolObjFalse = new Boolean(false);

// Test that Boolean objects are objects, not primitives
if (typeof boolObjTrue == "object") console.log("PASS: typeof new Boolean(true) is 'object'");
if (typeof boolObjTrue != "object") console.log("FAIL: typeof new Boolean(true) is 'object', got", typeof boolObjTrue);

if (typeof boolObjFalse == "object") console.log("PASS: typeof new Boolean(false) is 'object'");
if (typeof boolObjFalse != "object") console.log("FAIL: typeof new Boolean(false) is 'object', got", typeof boolObjFalse);

// Test Boolean objects in boolean context (should be truthy)
if (boolObjTrue) console.log("PASS: new Boolean(true) is truthy");
if (!boolObjTrue) console.log("FAIL: new Boolean(true) is truthy");

// Important: Boolean objects are always truthy, even when wrapping false
if (boolObjFalse) console.log("PASS: new Boolean(false) is truthy (object behavior)");
if (!boolObjFalse) console.log("FAIL: new Boolean(false) is truthy (object behavior)");

// Test Boolean objects with no arguments
var boolObjEmpty = new Boolean();
if (typeof boolObjEmpty == "object") console.log("PASS: typeof new Boolean() is 'object'");
if (typeof boolObjEmpty != "object") console.log("FAIL: typeof new Boolean() is 'object', got", typeof boolObjEmpty);

if (boolObjEmpty) console.log("PASS: new Boolean() is truthy");
if (!boolObjEmpty) console.log("FAIL: new Boolean() is truthy");

// Test Boolean objects with various values
var boolObjZero = new Boolean(0);
if (typeof boolObjZero == "object") console.log("PASS: typeof new Boolean(0) is 'object'");
if (typeof boolObjZero != "object") console.log("FAIL: typeof new Boolean(0) is 'object', got", typeof boolObjZero);

if (boolObjZero) console.log("PASS: new Boolean(0) is truthy");
if (!boolObjZero) console.log("FAIL: new Boolean(0) is truthy");

var boolObjString = new Boolean("hello");
if (typeof boolObjString == "object") console.log("PASS: typeof new Boolean('hello') is 'object'");
if (typeof boolObjString != "object") console.log("FAIL: typeof new Boolean('hello') is 'object', got", typeof boolObjString);

if (boolObjString) console.log("PASS: new Boolean('hello') is truthy");
if (!boolObjString) console.log("FAIL: new Boolean('hello') is truthy");

var boolObjEmptyString = new Boolean("");
if (typeof boolObjEmptyString == "object") console.log("PASS: typeof new Boolean('') is 'object'");
if (typeof boolObjEmptyString != "object") console.log("FAIL: typeof new Boolean('') is 'object', got", typeof boolObjEmptyString);

if (boolObjEmptyString) console.log("PASS: new Boolean('') is truthy");
if (!boolObjEmptyString) console.log("FAIL: new Boolean('') is truthy");

// Test valueOf() method
if (boolObjTrue.valueOf() == true) console.log("PASS: new Boolean(true).valueOf() returns true");
if (boolObjTrue.valueOf() != true) console.log("FAIL: new Boolean(true).valueOf() returns true, got", boolObjTrue.valueOf());

if (boolObjFalse.valueOf() == false) console.log("PASS: new Boolean(false).valueOf() returns false");
if (boolObjFalse.valueOf() != false) console.log("FAIL: new Boolean(false).valueOf() returns false, got", boolObjFalse.valueOf());

if (typeof boolObjTrue.valueOf() == "boolean") console.log("PASS: typeof new Boolean(true).valueOf() is 'boolean'");
if (typeof boolObjTrue.valueOf() != "boolean") console.log("FAIL: typeof new Boolean(true).valueOf() is 'boolean', got", typeof boolObjTrue.valueOf());

// Test toString() method
if (boolObjTrue.toString() == "true") console.log("PASS: new Boolean(true).toString() returns 'true'");
if (boolObjTrue.toString() != "true") console.log("FAIL: new Boolean(true).toString() returns 'true', got", boolObjTrue.toString());

if (boolObjFalse.toString() == "false") console.log("PASS: new Boolean(false).toString() returns 'false'");
if (boolObjFalse.toString() != "false") console.log("FAIL: new Boolean(false).toString() returns 'false', got", boolObjFalse.toString());

if (typeof boolObjTrue.toString() == "string") console.log("PASS: typeof new Boolean(true).toString() is 'string'");
if (typeof boolObjTrue.toString() != "string") console.log("FAIL: typeof new Boolean(true).toString() is 'string', got", typeof boolObjTrue.toString());

// Test comparison with primitives
if (boolObjTrue == true) console.log("PASS: new Boolean(true) == true");
if (boolObjTrue != true) console.log("FAIL: new Boolean(true) == true");

if (boolObjFalse == false) console.log("PASS: new Boolean(false) == false");
if (boolObjFalse != false) console.log("FAIL: new Boolean(false) == false");

// Test that Boolean objects are not strictly equal to primitives
if (boolObjTrue !== true) console.log("PASS: new Boolean(true) !== true");
if (boolObjTrue === true) console.log("FAIL: new Boolean(true) !== true");

if (boolObjFalse !== false) console.log("PASS: new Boolean(false) !== false");
if (boolObjFalse === false) console.log("FAIL: new Boolean(false) !== false");

console.log("=== Boolean Object Test Complete ==="); 