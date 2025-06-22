// Error constructor comprehensive test - all Error functionality
console.log("=== Error Comprehensive Test ===");

// Test 1: Basic Error constructor
console.log("--- Basic Error Constructor Tests ---");

console.log("Test 1.1: Error with message");
var err1 = Error("Something went wrong");
if (err1.name == "Error") console.log("PASS: Error name property");
if (err1.name != "Error") console.log("FAIL: Error name property, got", err1.name);

if (err1.message == "Something went wrong") console.log("PASS: Error message property");
if (err1.message != "Something went wrong") console.log("FAIL: Error message property, got", err1.message);

console.log("Test 1.2: Error without message");
var err2 = Error();
if (err2.name == "Error") console.log("PASS: Error name without message");
if (err2.name != "Error") console.log("FAIL: Error name without message, got", err2.name);

if (err2.message == "") console.log("PASS: Empty message when no argument");
if (err2.message != "") console.log("FAIL: Empty message when no argument, got", err2.message);

console.log("Test 1.3: Error with empty string message");
var err3 = Error("");
if (err3.name == "Error") console.log("PASS: Error name with empty string");
if (err3.name != "Error") console.log("FAIL: Error name with empty string, got", err3.name);

if (err3.message == "") console.log("PASS: Empty string message");
if (err3.message != "") console.log("FAIL: Empty string message, got", err3.message);

// Test 2: Error toString method
console.log("--- Error toString Method Tests ---");

console.log("Test 2.1: toString with message");
var toStringResult1 = err1.toString();
if (toStringResult1 == "Error: Something went wrong") console.log("PASS: toString with message");
if (toStringResult1 != "Error: Something went wrong") console.log("FAIL: toString with message, got", toStringResult1);

console.log("Test 2.2: toString without message");
var toStringResult2 = err2.toString();
if (toStringResult2 == "Error") console.log("PASS: toString without message");
if (toStringResult2 != "Error") console.log("FAIL: toString without message, got", toStringResult2);

console.log("Test 2.3: toString with empty message");
var toStringResult3 = err3.toString();
if (toStringResult3 == "Error") console.log("PASS: toString with empty message");
if (toStringResult3 != "Error") console.log("FAIL: toString with empty message, got", toStringResult3);

// Test 3: Error method access and types
console.log("--- Error Method Access Tests ---");

console.log("Test 3.1: toString method type");
if (typeof err1.toString == "function") console.log("PASS: toString is a function");
if (typeof err1.toString != "function") console.log("FAIL: toString is a function, got", typeof err1.toString);

console.log("Test 3.2: toString method exists on all Error instances");
if (typeof err2.toString == "function") console.log("PASS: toString exists on Error without message");
if (typeof err2.toString != "function") console.log("FAIL: toString exists on Error without message");

if (typeof err3.toString == "function") console.log("PASS: toString exists on Error with empty message");
if (typeof err3.toString != "function") console.log("FAIL: toString exists on Error with empty message");

// Test 4: Different error messages
console.log("--- Various Error Messages Tests ---");

console.log("Test 4.1: Network error");
var networkErr = Error("Network timeout");
if (networkErr.message == "Network timeout") console.log("PASS: Network error message");
if (networkErr.message != "Network timeout") console.log("FAIL: Network error message");

if (networkErr.toString() == "Error: Network timeout") console.log("PASS: Network error toString");
if (networkErr.toString() != "Error: Network timeout") console.log("FAIL: Network error toString");

console.log("Test 4.2: Validation error");
var validationErr = Error("Invalid input provided");
if (validationErr.message == "Invalid input provided") console.log("PASS: Validation error message");
if (validationErr.message != "Invalid input provided") console.log("FAIL: Validation error message");

if (validationErr.toString() == "Error: Invalid input provided") console.log("PASS: Validation error toString");
if (validationErr.toString() != "Error: Invalid input provided") console.log("FAIL: Validation error toString");

console.log("Test 4.3: Numeric message");
var numericErr = Error(404);
if (numericErr.message == "404") console.log("PASS: Numeric message converted to string");
if (numericErr.message != "404") console.log("FAIL: Numeric message converted to string, got", numericErr.message);

// Test 5: Error throwing and catching
console.log("--- Error Throwing and Catching Tests ---");

console.log("Test 5.1: Throwing Error with message");
try {
    throw Error("Test error for throwing");
    console.log("FAIL: Code after throw should not execute");
} catch (e) {
    if (e.name == "Error") console.log("PASS: Caught Error has correct name");
    if (e.name != "Error") console.log("FAIL: Caught Error has correct name, got", e.name);
    
    if (e.message == "Test error for throwing") console.log("PASS: Caught Error has correct message");
    if (e.message != "Test error for throwing") console.log("FAIL: Caught Error has correct message, got", e.message);
    
    if (typeof e.toString == "function") console.log("PASS: Caught Error has toString method");
    if (typeof e.toString != "function") console.log("FAIL: Caught Error has toString method");
}

console.log("Test 5.2: Throwing Error without message");
try {
    throw Error();
    console.log("FAIL: Code after throw should not execute");
} catch (e) {
    if (e.name == "Error") console.log("PASS: Caught Error without message has correct name");
    if (e.name != "Error") console.log("FAIL: Caught Error without message has correct name");
    
    if (e.message == "") console.log("PASS: Caught Error without message has empty message");
    if (e.message != "") console.log("FAIL: Caught Error without message has empty message");
}

// Test 6: Error in functions
console.log("--- Error in Functions Tests ---");

console.log("Test 6.1: Function returning Error");
function createError(msg) {
    return Error(msg);
}

var funcErr = createError("Function created error");
if (funcErr.name == "Error") console.log("PASS: Function-created Error has correct name");
if (funcErr.name != "Error") console.log("FAIL: Function-created Error has correct name");

if (funcErr.message == "Function created error") console.log("PASS: Function-created Error has correct message");
if (funcErr.message != "Function created error") console.log("FAIL: Function-created Error has correct message");

console.log("Test 6.2: Function throwing Error");
function throwError(msg) {
    throw Error(msg);
}

try {
    throwError("Function thrown error");
    console.log("FAIL: Function should have thrown error");
} catch (e) {
    if (e.message == "Function thrown error") console.log("PASS: Function-thrown Error caught correctly");
    if (e.message != "Function thrown error") console.log("FAIL: Function-thrown Error caught correctly");
}

// Test 7: Error property modification
console.log("--- Error Property Modification Tests ---");

console.log("Test 7.1: Modifying Error message");
var modifiableErr = Error("Original message");
modifiableErr.message = "Modified message";
if (modifiableErr.message == "Modified message") console.log("PASS: Error message can be modified");
if (modifiableErr.message != "Modified message") console.log("FAIL: Error message can be modified");

if (modifiableErr.toString() == "Error: Modified message") console.log("PASS: toString reflects modified message");
if (modifiableErr.toString() != "Error: Modified message") console.log("FAIL: toString reflects modified message");

console.log("Test 7.2: Modifying Error name");
var customErr = Error("Custom error");
customErr.name = "CustomError";
if (customErr.name == "CustomError") console.log("PASS: Error name can be modified");
if (customErr.name != "CustomError") console.log("FAIL: Error name can be modified");

if (customErr.toString() == "CustomError: Custom error") console.log("PASS: toString reflects modified name");
if (customErr.toString() != "CustomError: Custom error") console.log("FAIL: toString reflects modified name");

// Test 8: Multiple Error instances
console.log("--- Multiple Error Instances Tests ---");

console.log("Test 8.1: Independent Error instances");
var err_a = Error("Error A");
var err_b = Error("Error B");

if (err_a.message == "Error A") console.log("PASS: First Error instance has correct message");
if (err_a.message != "Error A") console.log("FAIL: First Error instance has correct message");

if (err_b.message == "Error B") console.log("PASS: Second Error instance has correct message");
if (err_b.message != "Error B") console.log("FAIL: Second Error instance has correct message");

err_a.message = "Modified A";
if (err_a.message == "Modified A") console.log("PASS: Modifying first Error doesn't affect second");
if (err_a.message != "Modified A") console.log("FAIL: Modifying first Error doesn't affect second");

if (err_b.message == "Error B") console.log("PASS: Second Error message unchanged");
if (err_b.message != "Error B") console.log("FAIL: Second Error message unchanged");

console.log("=== Error Comprehensive Test Complete ==="); 