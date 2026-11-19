// Test array methods (push, pop, length)

// Test basic array creation and length
var arr1 = [1, 2, 3];
if (arr1.length == 3)
  console.log("PASS: Array literal with 3 elements has correct length");
if (arr1.length != 3)
  console.log(
    "FAIL: Array literal with 3 elements - expected length 3, got",
    arr1.length
  );

// Test empty array
var arr2 = [];
if (arr2.length == 0) console.log("PASS: Empty array has length 0");
if (arr2.length != 0)
  console.log("FAIL: Empty array - expected length 0, got", arr2.length);

// Test mixed type array
var arr3 = [1, "hello", 3.14, true];
if (arr3.length == 4) console.log("PASS: Mixed type array has correct length");
if (arr3.length != 4)
  console.log("FAIL: Mixed type array - expected length 4, got", arr3.length);

// Test push method
var pushTest = [1, 2];
var originalLength = pushTest.length;
pushTest.push(3);
if (pushTest.length == originalLength + 1)
  console.log("PASS: Push method increases array length");
if (pushTest.length != originalLength + 1)
  console.log(
    "FAIL: Push method - expected length",
    originalLength + 1,
    "got",
    pushTest.length
  );

// Test push with multiple elements
var multiPush = [1];
multiPush.push(2);
multiPush.push(3);
multiPush.push(4);
if (multiPush.length == 4)
  console.log("PASS: Multiple push operations work correctly");
if (multiPush.length != 4)
  console.log(
    "FAIL: Multiple push operations - expected length 4, got",
    multiPush.length
  );

// Test pop method
var popTest = [1, 2, 3];
var originalPopLength = popTest.length;
var popped = popTest.pop();
if (popTest.length == originalPopLength - 1)
  console.log("PASS: Pop method decreases array length");
if (popTest.length != originalPopLength - 1)
  console.log(
    "FAIL: Pop method - expected length",
    originalPopLength - 1,
    "got",
    popTest.length
  );

// Test pop return value
var popReturn = [10, 20, 30];
var lastElement = popReturn.pop();
if (lastElement == 30) console.log("PASS: Pop returns the last element");
if (lastElement != 30)
  console.log("FAIL: Pop return value - expected 30, got", lastElement);

// Test pop on empty array
var emptyPop = [];
var emptyResult = emptyPop.pop();
if (typeof emptyResult == "undefined")
  console.log("PASS: Pop on empty array returns undefined");
if (typeof emptyResult != "undefined")
  console.log(
    "FAIL: Pop on empty array - expected undefined, got",
    typeof emptyResult
  );

// Test push and pop sequence
var sequence = [];
sequence.push(1);
sequence.push(2);
var first = sequence.pop();
var second = sequence.pop();
if (first == 2 && second == 1)
  console.log("PASS: Push/pop sequence works correctly (LIFO)");
if (first != 2 || second != 1)
  console.log("FAIL: Push/pop sequence - expected 2,1 got", first, second);

// Test array length after mixed operations
var mixed = [1, 2];
mixed.push(3);
mixed.push(4);
mixed.pop();
if (mixed.length == 3)
  console.log("PASS: Array length correct after mixed push/pop");
if (mixed.length != 3)
  console.log("FAIL: Mixed push/pop - expected length 3, got", mixed.length);
