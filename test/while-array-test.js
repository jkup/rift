// While loops with arrays

console.log("=== Testing While Loops with Arrays ===");

// Test 1: Building an array with while loop
console.log("\n1. Building array with while loop:");
var arr = [];
var i = 0;
while (i < 5) {
    arr.push(i * 2);
    console.log("Added:", i * 2, "Array length:", arr.length);
    i = i + 1;
}
console.log("Final array:", arr.toString());

// Test 2: Processing array elements
console.log("\n2. Processing array elements:");
var numbers = [1, 2, 3, 4, 5];
var index = 0;
var sum = 0;
while (index < numbers.length) {
    console.log("Processing index", index, "value:", numbers[index]);
    sum = sum + numbers[index];
    index = index + 1;
}
console.log("Sum of all elements:", sum);

// Test 3: Finding element in array
console.log("\n3. Finding element in array:");
var searchArray = [10, 20, 30, 40, 50];
var searchValue = 30;
var searchIndex = 0;
var found = false;
while (searchIndex < searchArray.length) {
    if (searchArray[searchIndex] == searchValue) {
        found = true;
        console.log("Found", searchValue, "at index", searchIndex);
        break;  // Note: break might not be implemented yet
    }
    searchIndex = searchIndex + 1;
}
if (!found) {
    console.log("Value", searchValue, "not found");
}

// Test 4: Removing elements (simulated with undefined)
console.log("\n4. Marking elements for removal:");
var dataArray = [1, 2, 3, 4, 5, 6];
var removeIndex = 0;
console.log("Original array:", dataArray.toString());
while (removeIndex < dataArray.length) {
    if (dataArray[removeIndex] % 2 == 0) {
        console.log("Marking even number", dataArray[removeIndex], "at index", removeIndex);
        dataArray[removeIndex] = undefined;
    }
    removeIndex = removeIndex + 1;
}
console.log("After marking evens as undefined:", dataArray.toString());

// Test 5: Using while with array methods
console.log("\n5. Using while with array methods:");
var stack = [];
var pushCount = 0;
while (pushCount < 4) {
    stack.push("item" + pushCount);
    console.log("Pushed item" + pushCount + ", stack length:", stack.length);
    pushCount = pushCount + 1;
}

var popCount = 0;
while (stack.length > 0 && popCount < 2) {
    var popped = stack.pop();
    console.log("Popped:", popped, "remaining length:", stack.length);
    popCount = popCount + 1;
}

console.log("\n=== While Loops with Arrays Tests Complete ==="); 