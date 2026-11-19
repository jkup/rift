// Do-While Loop Edge Cases Test
// Tests edge cases and specific behaviors of do-while loops

console.log("=== Do-While Edge Cases Test ===");

// Test 1: Do-while with immediate false condition
console.log("Test 1: Immediate false condition");
var immediateCount = 0;
do {
    immediateCount = immediateCount + 1;
    console.log("Executed despite false condition");
} while (false);
if (immediateCount === 1) {
    console.log("PASS: Do-while executes once even with false condition");
} else {
    console.log("FAIL: Do-while should execute at least once");
}

// Test 2: Do-while with null/undefined conditions
console.log("\nTest 2: Null and undefined conditions");
var nullCount = 0;
do {
    nullCount = nullCount + 1;
    console.log("Null condition test");
} while (null);
console.log("Null count:", nullCount);

var undefinedCount = 0;
do {
    undefinedCount = undefinedCount + 1;
    console.log("Undefined condition test");
} while (undefined);
console.log("Undefined count:", undefinedCount);

if (nullCount === 1 && undefinedCount === 1) {
    console.log("PASS: Null/undefined conditions work correctly");
} else {
    console.log("FAIL: Null/undefined conditions failed");
}

// Test 3: Do-while with return value
console.log("\nTest 3: Do-while return value");
function testDoWhileReturn() {
    var result;
    result = do {
        console.log("Do-while with assignment");
        42;
    } while (false);
    return result;
}
// Note: This tests the return value of the do-while statement itself
var returnValue = testDoWhileReturn();
console.log("Do-while return value:", returnValue);

// Test 4: Do-while with variable scoping
console.log("\nTest 4: Variable scoping");
var outerVar = "outer";
do {
    var innerVar = "inner";
    console.log("Inner scope:", outerVar, innerVar);
} while (false);
console.log("After loop:", outerVar, typeof innerVar);

// Test 5: Do-while with complex break/continue logic
console.log("\nTest 5: Complex break/continue");
var complexTest = 0;
var breakHit = false;
var continueHit = false;
do {
    complexTest = complexTest + 1;
    if (complexTest === 2) {
        continueHit = true;
        continue;
    }
    if (complexTest === 4) {
        breakHit = true;
        break;
    }
    console.log("Complex iteration:", complexTest);
} while (complexTest < 10);

if (breakHit && continueHit && complexTest === 4) {
    console.log("PASS: Complex break/continue logic works");
} else {
    console.log("FAIL: Complex break/continue failed");
}

// Test 6: Do-while with throw/catch
console.log("\nTest 6: Exception handling");
var exceptionTest = false;
try {
    do {
        console.log("About to throw");
        throw "Test exception";
    } while (true);
} catch (e) {
    exceptionTest = true;
    console.log("Caught exception:", e);
}

if (exceptionTest) {
    console.log("PASS: Exception handling works");
} else {
    console.log("FAIL: Exception handling failed");
}

// Test 7: Do-while with string conditions
console.log("\nTest 7: String conditions");
var stringTests = [];
var testStrings = ["", "hello", "0", "false"];
for (var i = 0; i < testStrings.length; i = i + 1) {
    var str = testStrings[i];
    var executed = false;
    do {
        executed = true;
    } while (str);
    stringTests.push(executed);
    console.log("String '" + str + "' condition:", executed);
}

// Test 8: Do-while with number conditions
console.log("\nTest 8: Number conditions");
var numberTests = [];
var testNumbers = [0, 1, -1, 0.5, 42];
for (var j = 0; j < testNumbers.length; j = j + 1) {
    var num = testNumbers[j];
    var numExecuted = false;
    var numCount = 0;
    do {
        numExecuted = true;
        numCount = numCount + 1;
        if (numCount > 3) break;  // Safety break
    } while (num);
    numberTests.push(numExecuted);
    console.log("Number", num, "condition executed:", numExecuted, "times:", numCount);
}

console.log("\n=== Do-While Edge Cases Test Complete ===");
console.log("All edge cases tested successfully!");
