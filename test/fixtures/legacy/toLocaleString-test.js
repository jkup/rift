// Test Array.prototype.toLocaleString and Object.prototype.toLocaleString

console.log("=== Testing toLocaleString ===");

// --- Array.prototype.toLocaleString ---

// Basic array
if ([1, 2, 3].toLocaleString() === "1,2,3") {
    console.log("PASS: [1, 2, 3].toLocaleString() returns '1,2,3'");
} else {
    console.log("FAIL: expected '1,2,3', got", [1, 2, 3].toLocaleString());
}

// Empty array
if ([].toLocaleString() === "") {
    console.log("PASS: [].toLocaleString() returns empty string");
} else {
    console.log("FAIL: expected '', got", [].toLocaleString());
}

// Null and undefined elements are skipped
if ([1, null, undefined, 3].toLocaleString() === "1,,,3") {
    console.log("PASS: null/undefined elements produce empty strings");
} else {
    console.log("FAIL: expected '1,,,3', got", [1, null, undefined, 3].toLocaleString());
}

// String elements
if (["a", "b", "c"].toLocaleString() === "a,b,c") {
    console.log("PASS: string elements work");
} else {
    console.log("FAIL: expected 'a,b,c', got", ["a", "b", "c"].toLocaleString());
}

// Custom toLocaleString on objects
var custom = { toLocaleString: function() { return "custom"; } };
if ([custom].toLocaleString() === "custom") {
    console.log("PASS: calls element's toLocaleString method");
} else {
    console.log("FAIL: expected 'custom', got", [custom].toLocaleString());
}

// Mixed types
var obj = { toLocaleString: function() { return "OBJ"; } };
if ([1, "two", obj].toLocaleString() === "1,two,OBJ") {
    console.log("PASS: mixed types work");
} else {
    console.log("FAIL: expected '1,two,OBJ', got", [1, "two", obj].toLocaleString());
}

// Boolean elements
if ([true, false].toLocaleString() === "true,false") {
    console.log("PASS: boolean elements work");
} else {
    console.log("FAIL: expected 'true,false', got", [true, false].toLocaleString());
}

// --- Object.prototype.toLocaleString ---

// Plain object
var plain = {};
if (plain.toLocaleString() === "[object Object]") {
    console.log("PASS: {}.toLocaleString() returns '[object Object]'");
} else {
    console.log("FAIL: expected '[object Object]', got", plain.toLocaleString());
}

// Object with custom toString
var withToString = { toString: function() { return "hello"; } };
if (withToString.toLocaleString() === "hello") {
    console.log("PASS: toLocaleString delegates to toString");
} else {
    console.log("FAIL: expected 'hello', got", withToString.toLocaleString());
}

// toLocaleString throws TypeError for null/undefined
var threw = false;
try {
    Object.prototype.toLocaleString.call(null);
} catch (e) {
    threw = true;
}
if (threw) {
    console.log("PASS: toLocaleString.call(null) throws TypeError");
} else {
    console.log("FAIL: toLocaleString.call(null) should throw");
}

threw = false;
try {
    Object.prototype.toLocaleString.call(undefined);
} catch (e) {
    threw = true;
}
if (threw) {
    console.log("PASS: toLocaleString.call(undefined) throws TypeError");
} else {
    console.log("FAIL: toLocaleString.call(undefined) should throw");
}

// Number primitive inherits toLocaleString
if ((42).toLocaleString() === "42") {
    console.log("PASS: (42).toLocaleString() returns '42'");
} else {
    console.log("FAIL: expected '42', got", (42).toLocaleString());
}

// toLocaleString exists on prototype
if (typeof Array.prototype.toLocaleString === "function") {
    console.log("PASS: Array.prototype.toLocaleString is a function");
} else {
    console.log("FAIL: Array.prototype.toLocaleString should be a function");
}

if (typeof Object.prototype.toLocaleString === "function") {
    console.log("PASS: Object.prototype.toLocaleString is a function");
} else {
    console.log("FAIL: Object.prototype.toLocaleString should be a function");
}

console.log("=== toLocaleString tests complete ===");
