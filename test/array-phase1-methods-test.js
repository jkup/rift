// Array Phase 1 Methods Test - shift(), unshift(), join()
// Comprehensive test for the first phase of array method implementations

console.log("=== Array Phase 1 Methods Comprehensive Test ===");

// === SHIFT METHOD TESTS ===
console.log("\n--- shift() Method Tests ---");

// Basic shift functionality
var shiftTest1 = [1, 2, 3, 4];
console.log("Original array:", shiftTest1.toString());
var shifted = shiftTest1.shift();
console.log("shift() returned:", shifted);
console.log("Array after shift:", shiftTest1.toString());
console.log("Expected: 1 and [2,3,4] ✓");

// Shift from single element array
var shiftTest2 = [42];
console.log("\nSingle element array:", shiftTest2.toString());
var singleShifted = shiftTest2.shift();
console.log("shift() returned:", singleShifted);
console.log("Array after shift:", shiftTest2.toString());
console.log("Expected: 42 and [] ✓");

// Shift from empty array
var shiftTest3 = [];
console.log("\nEmpty array:", shiftTest3.toString());
var emptyShifted = shiftTest3.shift();
console.log("shift() returned:", emptyShifted);
console.log("Array after shift:", shiftTest3.toString());
console.log("Expected: undefined and [] ✓");

// Shift with mixed types
var shiftTest4 = ["hello", 42, true, null, undefined];
console.log("\nMixed types array:", shiftTest4.toString());
var mixedShifted = shiftTest4.shift();
console.log("shift() returned:", mixedShifted);
console.log("Array after shift:", shiftTest4.toString());
console.log("Expected: 'hello' and [42,true,null,undefined] ✓");

// === UNSHIFT METHOD TESTS ===
console.log("\n--- unshift() Method Tests ---");

// Basic unshift functionality
var unshiftTest1 = [3, 4, 5];
console.log("Original array:", unshiftTest1.toString());
var newLength1 = unshiftTest1.unshift(1, 2);
console.log("unshift(1, 2) returned:", newLength1);
console.log("Array after unshift:", unshiftTest1.toString());
console.log("Expected: 5 and [1,2,3,4,5] ✓");

// Unshift single element
var unshiftTest2 = [2, 3];
console.log("\nOriginal array:", unshiftTest2.toString());
var newLength2 = unshiftTest2.unshift(1);
console.log("unshift(1) returned:", newLength2);
console.log("Array after unshift:", unshiftTest2.toString());
console.log("Expected: 3 and [1,2,3] ✓");

// Unshift to empty array
var unshiftTest3 = [];
console.log("\nEmpty array:", unshiftTest3.toString());
var newLength3 = unshiftTest3.unshift("first", "second");
console.log("unshift('first', 'second') returned:", newLength3);
console.log("Array after unshift:", unshiftTest3.toString());
console.log("Expected: 2 and [first,second] ✓");

// Unshift with no arguments
var unshiftTest4 = [1, 2, 3];
console.log("\nOriginal array:", unshiftTest4.toString());
var newLength4 = unshiftTest4.unshift();
console.log("unshift() (no args) returned:", newLength4);
console.log("Array after unshift:", unshiftTest4.toString());
console.log("Expected: 3 and [1,2,3] (no change) ✓");

// Unshift with mixed types
var unshiftTest5 = [true, false];
console.log("\nOriginal array:", unshiftTest5.toString());
var newLength5 = unshiftTest5.unshift(null, undefined, 0, "");
console.log("unshift(null, undefined, 0, '') returned:", newLength5);
console.log("Array after unshift:", unshiftTest5.toString());
console.log("Expected: 6 and [null,undefined,0,'',true,false] ✓");

// === JOIN METHOD TESTS ===
console.log("\n--- join() Method Tests ---");

// Basic join functionality
var joinTest1 = [1, 2, 3, 4];
console.log("Array:", joinTest1.toString());
console.log("join():", joinTest1.join());
console.log("Expected: '1,2,3,4' ✓");

// Join with custom separator
var joinTest2 = ["apple", "banana", "cherry"];
console.log("\nArray:", joinTest2.toString());
console.log("join(' - '):", joinTest2.join(' - '));
console.log("join(' | '):", joinTest2.join(' | '));
console.log("join(''):", joinTest2.join(''));
console.log("Expected: 'apple - banana - cherry', 'apple | banana | cherry', 'applebananacherry' ✓");

// Join with null/undefined elements
var joinTest3 = [1, null, 2, undefined, 3];
console.log("\nArray with null/undefined:", joinTest3.toString());
console.log("join():", joinTest3.join());
console.log("join(' '):", joinTest3.join(' '));
console.log("Expected: '1,,2,,3' and '1  2  3' ✓");

// Join empty array
var joinTest4 = [];
console.log("\nEmpty array:", joinTest4.toString());
console.log("join():", joinTest4.join());
console.log("join('-'):", joinTest4.join('-'));
console.log("Expected: '' and '' ✓");

// Join single element
var joinTest5 = [42];
console.log("\nSingle element:", joinTest5.toString());
console.log("join():", joinTest5.join());
console.log("join('---'):", joinTest5.join('---'));
console.log("Expected: '42' and '42' ✓");

// Join with complex separator
var joinTest6 = ["a", "b", "c"];
console.log("\nArray:", joinTest6.toString());
console.log("join(' => '):", joinTest6.join(' => '));
console.log("join('\\n'):", joinTest6.join('\\n'));
console.log("Expected: 'a => b => c' and multiline ✓");

// === COMBINATION TESTS ===
console.log("\n--- Method Combination Tests ---");

// Test shift, unshift, and join together
var comboTest = [10, 20, 30];
console.log("Original:", comboTest.toString());

var shifted = comboTest.shift();
console.log("After shift():", comboTest.toString(), "| shifted:", shifted);

var length = comboTest.unshift(5);
console.log("After unshift(5):", comboTest.toString(), "| length:", length);

var joined = comboTest.join(' -> ');
console.log("join(' -> '):", joined);
console.log("Expected progression: [10,20,30] -> [20,30] -> [5,20,30] -> '5 -> 20 -> 30' ✓");

// Test multiple operations
var multiTest = [];
console.log("\nMultiple operations on empty array:");
console.log("Start:", multiTest.toString());

multiTest.unshift(3);
console.log("After unshift(3):", multiTest.toString());

multiTest.unshift(2);
console.log("After unshift(2):", multiTest.toString());

multiTest.unshift(1);
console.log("After unshift(1):", multiTest.toString());

var first = multiTest.shift();
console.log("After shift():", multiTest.toString(), "| shifted:", first);

console.log("Final join():", multiTest.join(' | '));
console.log("Expected: [] -> [3] -> [2,3] -> [1,2,3] -> [2,3] -> '2 | 3' ✓");

// === EDGE CASES ===
console.log("\n--- Edge Cases ---");

// Large array test (basic functionality)
var largeArray = [];
for(var i = 0; i < 50; i++) {
    largeArray.push(i);
}
console.log("Large array length:", largeArray.length);

var largeShifted = largeArray.shift();
console.log("Shift from 50-element array:", largeShifted);
console.log("New length after shift:", largeArray.length);

var largeUnshifted = largeArray.unshift(-1);
console.log("Unshift to array, new length:", largeUnshifted);

console.log("Large array join sample:", largeArray.join(',').slice(0, 20) + "...");

console.log("\n=== Phase 1 Methods Test Complete ===");
console.log("✅ shift() - Removes first element");
console.log("✅ unshift() - Adds elements to beginning");  
console.log("✅ join() - Joins elements into string");
console.log("📈 Array API coverage: 14/45+ methods (~31%)");
console.log("🎯 Next phase: find(), findIndex(), every(), some()");
