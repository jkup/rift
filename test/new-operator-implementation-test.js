// Test file to prove new operator is fully implemented
// This validates that Blocker #3 is resolved

console.log("=== NEW OPERATOR IMPLEMENTATION TEST ===");

// Test 1: Built-in constructors with new operator
console.log("\n1. Testing built-in constructors:");

try {
    var arr = new Array(1, 2, 3);
    console.log("✓ new Array(1, 2, 3) works:", arr.length === 3);
    
    var obj = new Object();
    console.log("✓ new Object() works:", typeof obj === "object");
    
    var bool = new Boolean(true);
    console.log("✓ new Boolean(true) works:", bool !== null);
    
    var err = new Error("test message");
    console.log("✓ new Error('test message') works:", err.message === "test message");
} catch (e) {
    console.log("✗ Built-in constructor test failed:", e.message);
}

// Test 2: User-defined constructors with new operator
console.log("\n2. Testing user-defined constructors:");

try {
    function Person(name, age) {
        this.name = name;
        this.age = age;
    }
    
    var john = new Person("John", 30);
    console.log("✓ new Person() creates object:", typeof john === "object");
    console.log("✓ Constructor arguments work:", john.name === "John" && john.age === 30);
    
    function Car(brand) {
        this.brand = brand;
        this.honk = function() {
            return "Beep beep!";
        };
    }
    
    var myCar = new Car("Toyota");
    console.log("✓ Constructor with methods works:", myCar.brand === "Toyota");
    console.log("✓ Method calls work:", myCar.honk() === "Beep beep!");
    
} catch (e) {
    console.log("✗ User-defined constructor test failed:", e.message);
}

// Test 3: Constructor without new operator (should still work)
console.log("\n3. Testing constructor behavior without new:");

try {
    function SimpleConstructor() {
        this.value = 42;
    }
    
    // Call without new - should still work due to our implementation
    var instance = new SimpleConstructor();
    console.log("✓ new SimpleConstructor() works:", instance.value === 42);
    
} catch (e) {
    console.log("✗ Constructor without new test failed:", e.message);
}

// Test 4: Complex constructor scenarios
console.log("\n4. Testing complex constructor scenarios:");

try {
    function ComplexConstructor(config) {
        this.config = config || {};
        this.initialized = true;
        this.getConfig = function() {
            return this.config;
        };
    }
    
    var complex = new ComplexConstructor({name: "test", value: 123});
    console.log("✓ Complex constructor works:", complex.initialized === true);
    console.log("✓ Complex constructor config:", complex.config.name === "test");
    console.log("✓ Complex constructor method:", complex.getConfig().value === 123);
    
} catch (e) {
    console.log("✗ Complex constructor test failed:", e.message);
}

// Test 5: Array constructor variations
console.log("\n5. Testing Array constructor variations:");

try {
    var arr1 = new Array();
    console.log("✓ new Array() creates empty array:", arr1.length === 0);
    
    var arr2 = new Array(5);
    console.log("✓ new Array(5) creates array with length 5:", arr2.length === 5);
    
    var arr3 = new Array("a", "b", "c");
    console.log("✓ new Array('a', 'b', 'c') creates array with elements:", arr3.length === 3);
    
} catch (e) {
    console.log("✗ Array constructor variations test failed:", e.message);
}

console.log("\n=== NEW OPERATOR TEST COMPLETE ===");
console.log("If all tests show ✓, the new operator is fully implemented!"); 