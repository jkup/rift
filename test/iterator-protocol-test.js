// Test ES6 Iterator Protocol

// ============================================================================
// Test 1: Array.prototype.keys()
// ============================================================================
var arr = [10, 20, 30];
var keys = arr.keys();
var k1 = keys.next();
console.log(k1.value === 0 && k1.done === false);  // true
var k2 = keys.next();
console.log(k2.value === 1 && k2.done === false);  // true
var k3 = keys.next();
console.log(k3.value === 2 && k3.done === false);  // true
var k4 = keys.next();
console.log(k4.done === true);  // true

// ============================================================================
// Test 2: Array.prototype.values()
// ============================================================================
var values = arr.values();
var v1 = values.next();
console.log(v1.value === 10 && v1.done === false);  // true
var v2 = values.next();
console.log(v2.value === 20);  // true
var v3 = values.next();
console.log(v3.value === 30);  // true
var v4 = values.next();
console.log(v4.done === true);  // true

// ============================================================================
// Test 3: Array.prototype.entries()
// ============================================================================
var entries = arr.entries();
var e1 = entries.next();
console.log(e1.value[0] === 0 && e1.value[1] === 10);  // true
var e2 = entries.next();
console.log(e2.value[0] === 1 && e2.value[1] === 20);  // true
var e3 = entries.next();
console.log(e3.value[0] === 2 && e3.value[1] === 30);  // true
var e4 = entries.next();
console.log(e4.done === true);  // true

// ============================================================================
// Test 4: Array[Symbol.iterator] is same as values()
// ============================================================================
var iter1 = arr[Symbol.iterator]();
var i1 = iter1.next();
console.log(i1.value === 10);  // true

// ============================================================================
// Test 5: Iterator exhaustion
// ============================================================================
var smallArr = [1];
var smallIter = smallArr[Symbol.iterator]();
smallIter.next();  // Get the only element
var exhausted = smallIter.next();
console.log(exhausted.done === true && exhausted.value === undefined);  // true
// Once exhausted, should stay exhausted
var stillExhausted = smallIter.next();
console.log(stillExhausted.done === true);  // true

// ============================================================================
// Test 6: Iterators are themselves iterable
// ============================================================================
var iter2 = arr[Symbol.iterator]();
console.log(iter2[Symbol.iterator]() === iter2);  // true

var keysIter = arr.keys();
console.log(keysIter[Symbol.iterator]() === keysIter);  // true

// ============================================================================
// Test 7: String[Symbol.iterator]
// ============================================================================
var str = "abc";
var strIter = str[Symbol.iterator]();
var s1 = strIter.next();
console.log(s1.value === "a" && s1.done === false);  // true
var s2 = strIter.next();
console.log(s2.value === "b");  // true
var s3 = strIter.next();
console.log(s3.value === "c");  // true
var s4 = strIter.next();
console.log(s4.done === true);  // true

// ============================================================================
// Test 8: String iterator is iterable
// ============================================================================
var strIter2 = str[Symbol.iterator]();
console.log(strIter2[Symbol.iterator]() === strIter2);  // true

// ============================================================================
// Test 9: for-of with array
// ============================================================================
var sum = 0;
for (var x of [1, 2, 3, 4, 5]) {
    sum = sum + x;
}
console.log(sum === 15);  // true

// ============================================================================
// Test 10: for-of with string
// ============================================================================
var chars = [];
for (var c of "hello") {
    chars.push(c);
}
console.log(chars.length === 5);  // true
console.log(chars[0] === "h");  // true
console.log(chars[4] === "o");  // true

// ============================================================================
// Test 11: for-of with array.keys()
// ============================================================================
var indices = [];
for (var i of [10, 20, 30].keys()) {
    indices.push(i);
}
console.log(indices.length === 3);  // true
console.log(indices[0] === 0 && indices[1] === 1 && indices[2] === 2);  // true

// ============================================================================
// Test 12: for-of with array.entries()
// ============================================================================
var pairs = [];
for (var pair of ["a", "b"].entries()) {
    pairs.push(pair);
}
console.log(pairs.length === 2);  // true
console.log(pairs[0][0] === 0 && pairs[0][1] === "a");  // true
console.log(pairs[1][0] === 1 && pairs[1][1] === "b");  // true

// ============================================================================
// Test 13: Custom iterable object
// ============================================================================
var customIterable = {};
customIterable.data = [100, 200, 300];
customIterable[Symbol.iterator] = function() {
    var index = 0;
    var data = this.data;
    return {
        next: function() {
            if (index < data.length) {
                return { value: data[index++], done: false };
            }
            return { done: true, value: undefined };
        }
    };
};

var customSum = 0;
for (var val of customIterable) {
    customSum = customSum + val;
}
console.log(customSum === 600);  // true

// ============================================================================
// Test 14: Empty array iteration
// ============================================================================
var emptyIter = [].keys();
console.log(emptyIter.next().done === true);  // true

var emptyValuesIter = [].values();
console.log(emptyValuesIter.next().done === true);  // true

// ============================================================================
// Test 15: Empty string iteration
// ============================================================================
var emptyStrIter = ""[Symbol.iterator]();
console.log(emptyStrIter.next().done === true);  // true

console.log("All iterator protocol tests passed!");
