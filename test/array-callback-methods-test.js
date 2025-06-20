// Test for array callback methods: forEach, map, filter, reduce

console.log("=== Testing Array Callback Methods ===");

// Define callback functions using function declarations (which work)
function forEachCallback(element, index, array) {
    console.log("forEach element:", element, "index:", index);
    sum = sum + element;
}

function mapCallback(element) {
    return element * 2;
}

function filterCallback(element) {
    return element > 1;
}

function reduceCallback(acc, element) {
    return acc + element;
}

function productCallback(acc, element) {
    return acc * element;
}

// Test forEach
console.log("Testing forEach:");
var arr = [1, 2, 3];
var sum = 0;
arr.forEach(forEachCallback);
console.log("Sum after forEach:", sum);

// Test map
console.log("Testing map:");
var doubled = arr.map(mapCallback);
console.log("Original array length:", arr.length);
console.log("Doubled array length:", doubled.length);
console.log("Doubled[0]:", doubled[0], "Doubled[1]:", doubled[1], "Doubled[2]:", doubled[2]);

// Test filter
console.log("Testing filter:");
var filtered = arr.filter(filterCallback);
console.log("Filtered length:", filtered.length);
console.log("Filtered[0]:", filtered[0], "Filtered[1]:", filtered[1]);

// Test reduce
console.log("Testing reduce:");
var total = arr.reduce(reduceCallback, 0);
console.log("Reduce sum:", total);

// Test reduce without initial value
var product = arr.reduce(productCallback);
console.log("Reduce product:", product);

console.log("=== Array Callback Methods Test Complete ==="); 