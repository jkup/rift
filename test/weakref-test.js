// WeakRef tests

// Test 1: Basic construction and deref
var target = { name: "test" };
var wr = new WeakRef(target);
console.log("WeakRef deref returns target:", wr.deref() === target);

// Test 2: deref returns the same object
console.log("WeakRef deref identity:", wr.deref().name === "test");

// Test 3: TypeError for non-object target
var threw = false;
try {
    new WeakRef(42);
} catch (e) {
    threw = true;
    console.log("WeakRef rejects number:", e.toString().indexOf("TypeError") !== -1);
}
console.log("WeakRef threw for number:", threw);

// Test 4: TypeError for string target
threw = false;
try {
    new WeakRef("hello");
} catch (e) {
    threw = true;
    console.log("WeakRef rejects string:", e.toString().indexOf("TypeError") !== -1);
}
console.log("WeakRef threw for string:", threw);

// Test 5: TypeError for null target
threw = false;
try {
    new WeakRef(null);
} catch (e) {
    threw = true;
}
console.log("WeakRef threw for null:", threw);

// Test 6: TypeError for undefined target
threw = false;
try {
    new WeakRef(undefined);
} catch (e) {
    threw = true;
}
console.log("WeakRef threw for undefined:", threw);

// Test 7: TypeError for boolean target
threw = false;
try {
    new WeakRef(true);
} catch (e) {
    threw = true;
}
console.log("WeakRef threw for boolean:", threw);

// Test 8: Function as target is valid
var fn = function() {};
var wrFn = new WeakRef(fn);
console.log("WeakRef accepts function:", wrFn.deref() === fn);

// Test 9: Array as target is valid
var arr = [1, 2, 3];
var wrArr = new WeakRef(arr);
console.log("WeakRef accepts array:", wrArr.deref() === arr);

// Test 10: @@toStringTag
console.log("WeakRef toStringTag:", Object.prototype.toString.call(wr) === "[object WeakRef]");

// Test 11: prototype chain
console.log("WeakRef has deref:", typeof wr.deref === "function");

// Test 12: constructor property
console.log("WeakRef constructor:", wr.constructor === WeakRef);

console.log("All WeakRef tests completed!");
