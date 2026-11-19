// Simple array test
console.log("Testing array creation...");

var arr = [1, 2, 3];
console.log("Array created");
if (arr && arr.length == 3) console.log("PASS: Array created successfully");
if (!arr || arr.length != 3) console.log("FAIL: Array creation failed");

var obj = { name: "test", data: [4, 5, 6] };
console.log("Object with array created:", obj.name);
if (obj.name == "test") console.log("PASS: Object with array property created");
if (obj.name != "test") console.log("FAIL: Object with array property failed");

if (obj.data && obj.data.length == 3) console.log("PASS: Nested array in object works");
if (!obj.data || obj.data.length != 3) console.log("FAIL: Nested array in object failed");

console.log("Array test complete"); 