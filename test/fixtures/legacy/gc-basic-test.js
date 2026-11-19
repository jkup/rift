// Basic GC test - minimal JavaScript to test core functionality
// Avoid complex builtins that still need updating

var obj = {};
obj.name = "test";

var obj2 = {};
obj2.value = 42;

// Test basic assignment
var a = obj;
a = null;
obj = null;

// Test should collect the original object
gc(); 