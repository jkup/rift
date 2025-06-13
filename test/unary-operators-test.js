// Unary Operators Test Suite
// This file tests all implemented unary operators

console.log("=== UNARY OPERATORS TEST SUITE ===");
console.log("");

// Test 1: Unary Plus (+)
console.log("1. Testing Unary Plus (+):");
console.log("  +5 =", +5);
console.log("  +(-3) =", +-3);
console.log("  +0 =", +0);
var x = 42;
console.log("  +x (where x=42) =", +x);
console.log("");

// Test 2: Unary Minus (-)
console.log("2. Testing Unary Minus (-):");
console.log("  -5 =", -5);
console.log("  -(-3) =", -(-3));
console.log("  -0 =", -0);
var y = 42;
console.log("  -y (where y=42) =", -y);
console.log("");

// Test 3: Logical NOT (!)
console.log("3. Testing Logical NOT (!):");
console.log("  !true =", !true);
console.log("  !false =", !false);
console.log("  !0 =", !0);
console.log("  !1 =", !1);
console.log("  !42 =", !42);
var z = true;
console.log("  !z (where z=true) =", !z);
console.log("");

// Test 4: Double Logical NOT (!!)
console.log("4. Testing Double Logical NOT (!!):");
console.log("  !!true =", !!true);
console.log("  !!false =", !!false);
console.log("  !!0 =", !!0);
console.log("  !!1 =", !!1);
console.log("  !!42 =", !!42);
console.log("");

// Test 5: Bitwise NOT (~)
console.log("5. Testing Bitwise NOT (~):");
console.log("  ~0 =", ~0);
console.log("  ~1 =", ~1);
console.log("  ~5 =", ~5);
console.log("  ~(-1) =", ~-1);
console.log("  ~42 =", ~42);
console.log("");

// Test 6: typeof operator
console.log("6. Testing typeof operator:");
console.log("  typeof 42 =", typeof 42);
console.log("  typeof true =", typeof true);
console.log("  typeof false =", typeof false);
console.log("  typeof null =", typeof null);
console.log("  typeof undefined =", typeof undefined);
var str = "hello";
console.log('  typeof str (where str="hello") =', typeof str);
var num = 123;
console.log("  typeof num (where num=123) =", typeof num);
var bool = false;
console.log("  typeof bool (where bool=false) =", typeof bool);
console.log("");

// Test 7: typeof with undeclared variables
console.log("7. Testing typeof with undeclared variables:");
console.log("  typeof undeclaredVariable =", typeof undeclaredVariable);
console.log("  typeof nonExistent =", typeof nonExistent);
console.log("");

// Test 8: Complex nested expressions
console.log("8. Testing nested unary expressions:");
console.log("  -(-(-5)) =", -(-(-5)));
console.log("  +(+(+3)) =", +(+(+3)));
console.log("  !!(!false) =", !!!false);
console.log("  !(!(!true)) =", !!!true);
console.log("");

// Test 9: Mixed operators
console.log("9. Testing mixed unary operators:");
console.log("  !+0 =", !+0);
console.log("  !-1 =", !-1);
console.log("  +-5 =", +-5);
console.log("  -+7 =", -+7);
console.log("  ~+5 =", ~+5);
console.log("  ~-3 =", ~-3);
console.log("");

// Test 10: typeof with expressions
console.log("10. Testing typeof with expressions:");
console.log("  typeof (5 + 3) =", typeof (5 + 3));
console.log("  typeof (true == false) =", typeof (true == false));
console.log("  typeof (-42) =", typeof -42);
console.log("  typeof (!true) =", typeof !true);
console.log("");

console.log("=== END OF UNARY OPERATORS TEST SUITE ===");
