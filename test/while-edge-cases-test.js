// While loop edge cases and potential issues

console.log("=== Testing While Loop Edge Cases ===");

// Test 1: While with different truthy/falsy values
console.log("\n1. Different truthy/falsy conditions:");

// Falsy values that should not enter loop
var falsy_tests = [false, 0, "", null, undefined];
var falsy_index = 0;
while (falsy_index < falsy_tests.length) {
    var test_value = falsy_tests[falsy_index];
    console.log("Testing falsy value:", test_value);
    
    var entered = false;
    while (test_value) {
        entered = true;
        console.log("ERROR: Should not enter loop with falsy value");
        break; // Prevent infinite loop if something goes wrong
    }
    
    if (!entered) {
        console.log("PASS: Did not enter loop with falsy value");
    }
    
    falsy_index = falsy_index + 1;
}

// Test 2: While with block statements
console.log("\n2. While with block statements:");
var block_counter = 0;
while (block_counter < 3) {
    {
        var inner_var = block_counter * 2;
        console.log("Block inner:", inner_var);
    }
    console.log("After block, counter:", block_counter);
    block_counter = block_counter + 1;
}

// Test 3: Variable scope in while loops
console.log("\n3. Variable scope test:");
var outer_scope = "outer";
var scope_counter = 0;
while (scope_counter < 2) {
    var inner_scope = "inner_" + scope_counter;
    console.log("Inside loop - outer:", outer_scope, "inner:", inner_scope);
    scope_counter = scope_counter + 1;
}
console.log("After loop - outer:", outer_scope, "inner:", inner_scope);

// Test 4: Mathematical expressions in condition
console.log("\n4. Mathematical expressions in condition:");
var math_x = 1;
while (math_x * 2 < 10) {
    console.log("x:", math_x, "x*2:", math_x * 2);
    math_x = math_x + 2;
}

// Test 5: String operations in while condition
console.log("\n5. String operations in condition:");
var str = "hello";
var str_index = 0;
while (str_index < str.length) {
    console.log("Character at", str_index, ":", str.charAt(str_index));
    str_index = str_index + 1;
}

// Test 6: While loop with assignment in condition (not recommended but possible)
console.log("\n6. Assignment in condition (testing):");
var assign_test = 5;
// Note: This pattern isn't great but tests if assignment works in conditions
var temp_counter = 0;
while (temp_counter < 3) {
    assign_test = assign_test - 1;
    console.log("assign_test value:", assign_test);
    temp_counter = temp_counter + 1;
}

// Test 7: Empty body while loop (unusual but valid)
console.log("\n7. While loop with minimal body:");  
var minimal_counter = 0;
while (minimal_counter < 3) {
    minimal_counter = minimal_counter + 1;
}
console.log("Minimal loop completed, counter:", minimal_counter);

console.log("\n=== While Loop Edge Cases Tests Complete ==="); 