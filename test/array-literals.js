// Test array literal syntax

// Test basic array literals
var arr1 = [1, 2, 3];
if (arr1.length == 3) console.log("PASS: Basic array literal length");
if (arr1.length != 3)
  console.log(
    "FAIL: Basic array literal length - expected 3, got",
    arr1.length
  );

var arr2 = [];
if (arr2.length == 0) console.log("PASS: Empty array literal length");
if (arr2.length != 0)
  console.log(
    "FAIL: Empty array literal length - expected 0, got",
    arr2.length
  );

var arr3 = [1, "hello", 3.14, true];
if (arr3.length == 4) console.log("PASS: Mixed type array literal length");
if (arr3.length != 4)
  console.log(
    "FAIL: Mixed type array literal length - expected 4, got",
    arr3.length
  );

// Test single element arrays
var single = [42];
if (single.length == 1) console.log("PASS: Single element array length");
if (single.length != 1)
  console.log(
    "FAIL: Single element array length - expected 1, got",
    single.length
  );

// Test array with undefined/null
var withSpecial = [1, null, undefined, 4];
if (withSpecial.length == 4)
  console.log("PASS: Array with null/undefined length");
if (withSpecial.length != 4)
  console.log(
    "FAIL: Array with null/undefined length - expected 4, got",
    withSpecial.length
  );
