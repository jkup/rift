// Comprehensive Array test

// Test array creation with createArray helper
var arr = createArray();
if (arr.length == 0) console.log("PASS: createArray creates empty array");
if (arr.length != 0) console.log("FAIL: createArray creates empty array");

// Test push method
arr.push(10);
if (arr.length == 1) console.log("PASS: push increases length to 1");
if (arr.length != 1) console.log("FAIL: push increases length to 1");

arr.push(20);
if (arr.length == 2) console.log("PASS: push increases length to 2");
if (arr.length != 2) console.log("FAIL: push increases length to 2");

arr.push(30);
if (arr.length == 3) console.log("PASS: push increases length to 3");
if (arr.length != 3) console.log("FAIL: push increases length to 3");

// Test pop method
var val1 = arr.pop();
if (val1 == 30) console.log("PASS: pop returns last element");
if (val1 != 30) console.log("FAIL: pop returns last element");

if (arr.length == 2) console.log("PASS: pop decreases length to 2");
if (arr.length != 2) console.log("FAIL: pop decreases length to 2");

var val2 = arr.pop();
if (val2 == 20) console.log("PASS: pop returns second-to-last element");
if (val2 != 20) console.log("FAIL: pop returns second-to-last element");

if (arr.length == 1) console.log("PASS: pop decreases length to 1");
if (arr.length != 1) console.log("FAIL: pop decreases length to 1");

// Test pushing different types
arr.push("hello");
if (arr.length == 2) console.log("PASS: push string increases length");
if (arr.length != 2) console.log("FAIL: push string increases length");

arr.push(true);
if (arr.length == 3) console.log("PASS: push boolean increases length");
if (arr.length != 3) console.log("FAIL: push boolean increases length");

// Test final pop
var finalVal = arr.pop();
if (finalVal == true) console.log("PASS: pop returns boolean");
if (finalVal != true) console.log("FAIL: pop returns boolean");

if (arr.length == 2) console.log("PASS: final length is correct");
if (arr.length != 2) console.log("FAIL: final length is correct");
