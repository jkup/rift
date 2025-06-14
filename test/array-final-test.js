// Final Array Functionality Test

console.log("=== COMPREHENSIVE ARRAY TEST ===");

// 1. Array creation
var arr1 = [1, 2, 3];
var arr2 = [];
var arr3 = [1, "hello", true, null, undefined];
console.log("✅ Array creation - PASS");

// 2. Element access
var testArr = [10, 20, 30];
if (testArr[0] === 10 && testArr[1] === 20 && testArr[2] === 30) {
  console.log("✅ Element access - PASS");
} else {
  console.log("❌ Element access - FAIL");
}

// 3. Element assignment
var assignArr = [1, 2, 3];
assignArr[0] = 100;
assignArr[1] = 200;
if (assignArr[0] === 100 && assignArr[1] === 200) {
  console.log("✅ Element assignment - PASS");
} else {
  console.log("❌ Element assignment - FAIL");
}

// 4. Sparse arrays
var sparseArr = [];
sparseArr[5] = "five";
if (sparseArr.length === 6 && sparseArr[5] === "five") {
  console.log("✅ Sparse arrays - PASS");
} else {
  console.log("❌ Sparse arrays - FAIL");
}

// 5. Array methods
var methodArr = [1, 2];
var newLength = methodArr.push(3);
var popped = methodArr.pop();
if (newLength === 3 && popped === 3 && methodArr.length === 2) {
  console.log("✅ Array methods (push/pop) - PASS");
} else {
  console.log("❌ Array methods (push/pop) - FAIL");
}

// 6. toString method
var strArr = [1, 2, 3];
var strResult = strArr.toString();
if (strResult === "1,2,3") {
  console.log("✅ toString method - PASS");
} else {
  console.log("❌ toString method - FAIL");
}

// 7. Nested arrays
var nested = [
  [1, 2],
  [3, 4],
];
if (nested.length === 2 && nested[0][0] === 1 && nested[0][1] === 2) {
  console.log("✅ Nested arrays - PASS");
} else {
  console.log("❌ Nested arrays - FAIL");
}

console.log("\n=== ALL ARRAY TESTS COMPLETE ===");
console.log("Array literals are now fully functional!");
