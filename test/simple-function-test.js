// Test the exact createObjects function
console.log("Testing createObjects function...");

function createObjects() {
    var obj1 = { name: "object1", data: [1, 2, 3] };
    var obj2 = { name: "object2", data: [4, 5, 6] };
    return obj1;
}

var result = createObjects();
console.log("Function result:", result.name);

console.log("Function test complete"); 