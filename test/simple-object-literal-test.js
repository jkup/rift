// Simple object literal test with assertions

console.log("=== Simple Object Literal Test ===");

// Test empty object literal
var obj = {};
if (typeof obj == "object") {
    console.log("PASS: Empty object literal creates object");
} else {
    console.log("FAIL: Empty object literal creates object");
}

// Test object literal with property
var obj2 = { name: "test" };
if (typeof obj2 == "object") {
    console.log("PASS: Object literal with property creates object");
} else {
    console.log("FAIL: Object literal with property creates object");
}

if (obj2.name == "test") {
    console.log("PASS: Object property access works");
} else {
    console.log("FAIL: Object property access works");
}

// Test object literal with multiple properties
var obj3 = { name: "test", age: 25, active: true };
if (obj3.name == "test") {
    console.log("PASS: Multi-property object name access");
} else {
    console.log("FAIL: Multi-property object name access");
}

if (obj3.age == 25) {
    console.log("PASS: Multi-property object age access");
} else {
    console.log("FAIL: Multi-property object age access");
}

if (obj3.active == true) {
    console.log("PASS: Multi-property object boolean access");
} else {
    console.log("FAIL: Multi-property object boolean access");
}

console.log("=== Simple Object Literal Test Complete ==="); 