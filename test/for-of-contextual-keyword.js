// Test: "of" is a contextual keyword - can be used as identifier outside for-of

// Test 1: "of" as variable name
var of = 5;
console.log(of === 5);  // true

// Test 2: "of" as object property
var obj = { of: 10 };
console.log(obj.of === 10);  // true

// Test 3: "of" as function name
function of() { return 42; }
console.log(of() === 42);  // true

// Test 4: "of" in for-of still works
var arr = [1, 2, 3];
var sum = 0;
for (var x of arr) {
    sum = sum + x;
}
console.log(sum === 6);  // true

// Test 5: Variable named "of" with for-of in same scope
var of = 100;
var result = [];
for (var item of [4, 5, 6]) {
    result.push(item);
}
console.log(of === 100);  // true (variable preserved)
console.log(result.length === 3);  // true
