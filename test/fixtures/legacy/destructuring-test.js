// Destructuring Test
// Tests ES6 destructuring assignment for arrays and objects

console.log("=== Destructuring Test ===");

// ============================================
// ARRAY DESTRUCTURING
// ============================================

// Test 1: Basic array destructuring
console.log("Test 1: Basic array destructuring");
const [a, b] = [1, 2];
console.log("a:", a);
console.log("b:", b);

// Test 2: Array destructuring with extra elements
console.log("Test 2: Extra elements ignored");
const [x, y] = [1, 2, 3, 4];
console.log("x:", x);
console.log("y:", y);

// Test 3: Array destructuring with fewer elements
console.log("Test 3: Missing elements become undefined");
const [p, q, r] = [1, 2];
console.log("p:", p);
console.log("q:", q);
console.log("r:", r);

// Test 4: Array destructuring with holes (elision)
console.log("Test 4: Holes (elision)");
const [first, , third] = [1, 2, 3];
console.log("first:", first);
console.log("third:", third);

// Test 5: Array destructuring with rest
console.log("Test 5: Rest element");
const [head, ...tail] = [1, 2, 3, 4, 5];
console.log("head:", head);
console.log("tail.length:", tail.length);
console.log("tail[0]:", tail[0]);
console.log("tail[2]:", tail[2]);

// Test 6: Array destructuring with default values
console.log("Test 6: Default values");
const [d1, d2 = 10] = [5];
console.log("d1:", d1);
console.log("d2:", d2);

// Test 7: Default not used when value exists
console.log("Test 7: Default not used when value exists");
const [e1, e2 = 99] = [5, 6];
console.log("e1:", e1);
console.log("e2:", e2);

// Test 8: Empty array destructuring
console.log("Test 8: Empty array");
const [] = [];
console.log("Empty destructuring worked");

// ============================================
// OBJECT DESTRUCTURING
// ============================================

// Test 9: Basic object destructuring
console.log("Test 9: Basic object destructuring");
const {name, age} = {name: "Alice", age: 30};
console.log("name:", name);
console.log("age:", age);

// Test 10: Object destructuring with renaming
console.log("Test 10: Renaming");
const {name: userName, age: userAge} = {name: "Bob", age: 25};
console.log("userName:", userName);
console.log("userAge:", userAge);

// Test 11: Object destructuring with missing properties
console.log("Test 11: Missing properties");
const {foo, bar} = {foo: 1};
console.log("foo:", foo);
console.log("bar:", bar);

// Test 12: Object destructuring with defaults
console.log("Test 12: Defaults");
const {m = 5, n = 10} = {m: 3};
console.log("m:", m);
console.log("n:", n);

// Test 13: Object destructuring with renaming and defaults
console.log("Test 13: Renaming with defaults");
const {val: myVal = 42} = {};
console.log("myVal:", myVal);

// Test 14: Empty object destructuring
console.log("Test 14: Empty object");
const {} = {};
console.log("Empty object destructuring worked");

// ============================================
// NESTED DESTRUCTURING
// ============================================

// Test 15: Nested array destructuring
console.log("Test 15: Nested arrays");
const [[inner1, inner2], outer] = [[1, 2], 3];
console.log("inner1:", inner1);
console.log("inner2:", inner2);
console.log("outer:", outer);

// Test 16: Nested object destructuring
console.log("Test 16: Nested objects");
const {user: {firstName, lastName}} = {user: {firstName: "John", lastName: "Doe"}};
console.log("firstName:", firstName);
console.log("lastName:", lastName);

// Test 17: Object inside array
console.log("Test 17: Object inside array");
const [{id, value}] = [{id: 1, value: "test"}];
console.log("id:", id);
console.log("value:", value);

// Test 18: Array inside object
console.log("Test 18: Array inside object");
const {items: [item1, item2]} = {items: [10, 20]};
console.log("item1:", item1);
console.log("item2:", item2);

// ============================================
// VAR AND LET
// ============================================

// Test 19: var destructuring
console.log("Test 19: var destructuring");
var [v1, v2] = [100, 200];
console.log("v1:", v1);
console.log("v2:", v2);

// Test 20: let destructuring
console.log("Test 20: let destructuring");
let [l1, l2] = [300, 400];
console.log("l1:", l1);
console.log("l2:", l2);

// ============================================
// EDGE CASES
// ============================================

// Test 21: Destructuring from function return
console.log("Test 21: From function return");
function getCoords() {
    return [10, 20];
}
const [coordX, coordY] = getCoords();
console.log("coordX:", coordX);
console.log("coordY:", coordY);

// Test 22: Destructuring from object property
console.log("Test 22: From object property");
const data = {coords: [5, 15]};
const [cx, cy] = data.coords;
console.log("cx:", cx);
console.log("cy:", cy);

// Test 23: Rest with empty remaining
console.log("Test 23: Rest with empty remaining");
const [only, ...remaining] = [1];
console.log("only:", only);
console.log("remaining.length:", remaining.length);

// Test 24: Object rest (collect remaining properties)
console.log("Test 24: Object rest");
const {kept, ...others} = {kept: 1, extra1: 2, extra2: 3};
console.log("kept:", kept);
console.log("others.extra1:", others.extra1);
console.log("others.extra2:", others.extra2);

// Test 25: String destructuring (strings are iterable)
console.log("Test 25: String destructuring");
const [char1, char2, char3] = "abc";
console.log("char1:", char1);
console.log("char2:", char2);
console.log("char3:", char3);

console.log("=== Destructuring Test Complete ===");
console.log("All tests passed!");
