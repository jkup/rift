// Test array literal implementation
var arr1 = [1, 2, 3];
console.log("arr1 length:", arr1.length);

var arr2 = [];
console.log("arr2 length:", arr2.length);

var arr3 = [1, "hello", 3.14, true];
console.log("arr3 length:", arr3.length);

// Test array methods
arr1.push(4);
console.log("After push, arr1 length:", arr1.length);

var last = arr1.pop();
console.log("Popped element:", last);
console.log("After pop, arr1 length:", arr1.length);
