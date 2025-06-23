// Simple exception test
console.log("Testing exceptions...");

try {
    console.log("Before throw");
    throw "test exception";
} catch (e) {
    console.log("Caught:", e);
}

console.log("Exception test complete"); 