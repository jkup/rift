// Phase 1 GC Test - Test core GC functionality with minimal builtins
// This test focuses on basic object creation and GC collection

// Test 1: Basic object creation
var obj1 = {};
obj1.prop = "test";

// Test 2: Object assignment and nulling
var obj2 = obj1;
obj1 = null;

// Test 3: Create multiple objects
var obj3 = {};
var obj4 = {};
obj3.ref = obj4;
obj4.ref = obj3;  // Circular reference

// Test 4: Clear references
obj3 = null;
obj4 = null;

// Test 5: Simple property access
var obj5 = {};
obj5.value = 42;
var x = obj5.value;

obj5 = null; 