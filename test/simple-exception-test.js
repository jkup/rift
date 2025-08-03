// Simple exception test
console.log("Testing exceptions...");

var exceptionCaught = false;
var exceptionMessage = "";

try {
    console.log("Before throw");
    throw "test exception";
} catch (e) {
    console.log("Caught:", e);
    exceptionCaught = true;
    exceptionMessage = e;
}

// Verify exception handling worked
if (exceptionCaught) console.log("PASS: Exception was caught successfully");
if (!exceptionCaught) console.log("FAIL: Exception was not caught");

if (exceptionMessage == "test exception") console.log("PASS: Exception message correct");
if (exceptionMessage != "test exception") console.log("FAIL: Exception message incorrect");

console.log("Exception test complete"); 