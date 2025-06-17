// Simple object test
var obj = {};
console.log("Created empty object");

// Test Object.keys exists
if (typeof Object == "object") {
    console.log("PASS: Object exists");
} else {
    console.log("FAIL: Object not found");
}

if (typeof Object.keys == "function") {
    console.log("PASS: Object.keys exists");
} else {
    console.log("FAIL: Object.keys not found");
}

if (typeof Object.values == "function") {
    console.log("PASS: Object.values exists");
} else {
    console.log("FAIL: Object.values not found");
}

// Test with empty object
var keys = Object.keys(obj);
console.log("Object.keys called successfully");

if (keys.length == 0) {
    console.log("PASS: Empty object has 0 keys");
} else {
    console.log("FAIL: Empty object should have 0 keys, got", keys.length);
} 