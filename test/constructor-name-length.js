// Test: Built-in constructor name and length properties per ECMA-262 § 17
// Every built-in function constructor must have name and length properties with
// { writable: false, enumerable: false, configurable: true }

var pass = 0;
var fail = 0;

function check(label, actual, expected) {
    if (actual !== expected) {
        console.log("FAIL: " + label + " = " + actual + " (expected " + expected + ")");
        fail++;
    } else {
        pass++;
    }
}

function checkDescriptor(ctor, ctorName, prop) {
    var desc = Object.getOwnPropertyDescriptor(ctor, prop);
    var prefix = ctorName + "." + prop;
    check(prefix + " exists", desc !== undefined, true);
    if (desc) {
        check(prefix + " writable", desc.writable, false);
        check(prefix + " enumerable", desc.enumerable, false);
        check(prefix + " configurable", desc.configurable, true);
    }
}

// Core constructors
check("Array.name", Array.name, "Array");
check("Array.length", Array.length, 1);
checkDescriptor(Array, "Array", "name");
checkDescriptor(Array, "Array", "length");

check("Object.name", Object.name, "Object");
check("Object.length", Object.length, 1);

check("String.name", String.name, "String");
check("String.length", String.length, 1);

check("Number.name", Number.name, "Number");
check("Number.length", Number.length, 1);

check("Boolean.name", Boolean.name, "Boolean");
check("Boolean.length", Boolean.length, 1);

check("Function.name", Function.name, "Function");
check("Function.length", Function.length, 1);

// Error types
check("Error.name", Error.name, "Error");
check("Error.length", Error.length, 1);

check("TypeError.name", TypeError.name, "TypeError");
check("TypeError.length", TypeError.length, 1);

check("RangeError.name", RangeError.name, "RangeError");
check("RangeError.length", RangeError.length, 1);

check("ReferenceError.name", ReferenceError.name, "ReferenceError");
check("ReferenceError.length", ReferenceError.length, 1);

check("SyntaxError.name", SyntaxError.name, "SyntaxError");
check("SyntaxError.length", SyntaxError.length, 1);

check("EvalError.name", EvalError.name, "EvalError");
check("EvalError.length", EvalError.length, 1);

check("URIError.name", URIError.name, "URIError");
check("URIError.length", URIError.length, 1);

// Other constructors
check("RegExp.name", RegExp.name, "RegExp");
check("RegExp.length", RegExp.length, 2);

check("Date.name", Date.name, "Date");
check("Date.length", Date.length, 7);

check("Map.name", Map.name, "Map");
check("Map.length", Map.length, 0);

check("Set.name", Set.name, "Set");
check("Set.length", Set.length, 0);

check("WeakMap.name", WeakMap.name, "WeakMap");
check("WeakMap.length", WeakMap.length, 0);

check("WeakSet.name", WeakSet.name, "WeakSet");
check("WeakSet.length", WeakSet.length, 0);

check("WeakRef.name", WeakRef.name, "WeakRef");
check("WeakRef.length", WeakRef.length, 1);

check("Promise.name", Promise.name, "Promise");
check("Promise.length", Promise.length, 1);

check("Symbol.name", Symbol.name, "Symbol");
check("Symbol.length", Symbol.length, 0);

// Descriptor checks on a few more
checkDescriptor(Object, "Object", "name");
checkDescriptor(Object, "Object", "length");
checkDescriptor(Function, "Function", "name");
checkDescriptor(Function, "Function", "length");
checkDescriptor(Error, "Error", "name");
checkDescriptor(Error, "Error", "length");
checkDescriptor(Promise, "Promise", "name");
checkDescriptor(Promise, "Promise", "length");

if (fail > 0) {
    throw new Error(fail + " checks failed");
}
console.log("All " + pass + " constructor name/length checks passed");
