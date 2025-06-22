// While loops with arrays

console.log("=== Testing While Loops with Arrays ===");

// Test 1: Building an array with while loop
console.log("1. Building array with while loop:");
var arr = [];
var i = 0;
while (i < 5) {
    arr.push(i * 2);
    i = i + 1;
}
if (arr.length == 5) {
    console.log("PASS: While loop built array correctly");
} else {
    console.log("FAIL: While loop built array correctly");
}

if (arr[0] == 0 && arr[4] == 8) {
    console.log("PASS: Array elements are correct");
} else {
    console.log("FAIL: Array elements are correct");
}

// Test 2: Processing array elements
console.log("2. Processing array elements:");
var numbers = [1, 2, 3, 4, 5];
var index = 0;
var sum = 0;
while (index < numbers.length) {
    sum = sum + numbers[index];
    index = index + 1;
}
if (sum == 15) {
    console.log("PASS: While loop calculated sum correctly");
} else {
    console.log("FAIL: While loop calculated sum correctly, got", sum);
}

// Test 3: Finding element in array
console.log("3. Finding element in array:");
var searchArray = [10, 20, 30, 40, 50];
var searchValue = 30;
var searchIndex = 0;
var found = false;
while (searchIndex < searchArray.length) {
    if (searchArray[searchIndex] == searchValue) {
        found = true;
        // Note: break statement not implemented, so continue searching
    }
    searchIndex = searchIndex + 1;
}
if (found) {
    console.log("PASS: While loop found element in array");
} else {
    console.log("FAIL: While loop found element in array");
}

// Test 4: Modifying array elements
console.log("4. Modifying array elements:");
var dataArray = [1, 2, 3, 4, 5, 6];
var modifyIndex = 0;
var evenCount = 0;
while (modifyIndex < dataArray.length) {
    if (dataArray[modifyIndex] % 2 == 0) {
        evenCount = evenCount + 1;
        dataArray[modifyIndex] = 0;
    }
    modifyIndex = modifyIndex + 1;
}
if (evenCount == 3) {
    console.log("PASS: While loop found and modified even numbers");
} else {
    console.log("FAIL: While loop found and modified even numbers");
}

// Test 5: Using while with array methods
console.log("5. Using while with array methods:");
var stack = [];
var pushCount = 0;
while (pushCount < 4) {
    stack.push("item" + pushCount);
    pushCount = pushCount + 1;
}
if (stack.length == 4) {
    console.log("PASS: While loop with push method works");
} else {
    console.log("FAIL: While loop with push method works");
}

// Declare popped variable outside the loop to avoid scoping issues
var popped = "";
var popCount = 0;
while (stack.length > 0 && popCount < 2) {
    popped = stack.pop();
    popCount = popCount + 1;
}
if (stack.length == 2) {
    console.log("PASS: While loop with pop method works");
} else {
    console.log("FAIL: While loop with pop method works");
}

console.log("=== While Loops with Arrays Tests Complete ==="); 