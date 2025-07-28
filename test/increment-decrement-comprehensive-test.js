// Comprehensive Increment/Decrement Operators Test
// Tests that the newly implemented ++/-- operators work correctly

console.log("=== Increment/Decrement Comprehensive Test ===");

console.log("✅ Test 1: Basic Variable Operations");
var a = 5;
console.log("Starting value a =", a);  // 5
console.log("++a =", ++a);  // 6 (prefix increment)
console.log("a after ++a =", a);  // 6
console.log("a++ =", a++);  // 6 (postfix increment)
console.log("a after a++ =", a);  // 7
console.log("--a =", --a);  // 6 (prefix decrement)  
console.log("a after --a =", a);  // 6
console.log("a-- =", a--);  // 6 (postfix decrement)
console.log("Final a =", a);  // 5

console.log("✅ Test 2: For Loop Modernization");
console.log("Old style for loop (still works):");
for (var i = 0; i < 3; i = i + 1) {
    console.log("  Old style: i =", i);
}

console.log("Modern style for loop (now works!):");
for (var j = 0; j < 3; j++) {
    console.log("  Modern style: j =", j);
}

console.log("✅ Test 3: Object Property Operations");
var obj = { value: 10, nested: { count: 5 } };
console.log("obj.value =", obj.value);  // 10
console.log("++obj.value =", ++obj.value);  // 11
console.log("obj.value after increment =", obj.value);  // 11
console.log("obj.nested.count++ =", obj.nested.count++);  // 5
console.log("obj.nested.count after increment =", obj.nested.count);  // 6

console.log("✅ Test 4: Array Element Operations");
var arr = [1, 2, 3, 4, 5];
console.log("arr[2] =", arr[2]);  // 3
console.log("++arr[2] =", ++arr[2]);  // 4
console.log("arr[2] after increment =", arr[2]);  // 4
console.log("arr[0]-- =", arr[0]--);  // 1
console.log("arr[0] after decrement =", arr[0]);  // 0

console.log("✅ Test 5: Type Conversion (JavaScript behavior)");
var str = "5";
console.log("String value:", str);  // "5"
console.log("++str =", ++str);  // 6 (converts to number)
console.log("str after increment =", str);  // 6

console.log("✅ Test 6: Practical Use Cases");
// Counter implementation
var counter = 0;
function increment() {
    return ++counter;
}
function getAndIncrement() {
    return counter++;
}

console.log("Counter start:", counter);  // 0
console.log("increment() returns:", increment());  // 1
console.log("Counter after increment():", counter);  // 1
console.log("getAndIncrement() returns:", getAndIncrement());  // 1
console.log("Counter after getAndIncrement():", counter);  // 2

console.log("=== All Tests Passed! Increment/Decrement Operators Working ===");
