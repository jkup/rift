// Test 1: try/catch with await on rejected promise
async function test1() {
    try {
        await Promise.reject(new Error("oops"));
    } catch (e) {
        return "caught: " + e.message;
    }
}
test1().then(function(val) {
    console.log(val === "caught: oops"); // true
});

// Test 2: thrown error rejects the async function's promise
async function test2() {
    throw new Error("thrown");
}
test2().then(
    function() { console.log(false); },
    function(err) { console.log(err.message === "thrown"); } // true
);

// Test 3: await non-promise in try/catch
async function test3() {
    try {
        var x = await 42;
        return x;
    } catch (e) {
        return "error";
    }
}
test3().then(function(val) {
    console.log(val === 42); // true
});

// Test 4: catch with await inside catch block
async function test4() {
    try {
        throw new Error("first");
    } catch (e) {
        var result = await Promise.resolve("recovered from: " + e.message);
        return result;
    }
}
test4().then(function(val) {
    console.log(val === "recovered from: first"); // true
});

// Test 5: finally block runs after return with await
async function test5() {
    var ran = false;
    try {
        return await Promise.resolve("result");
    } finally {
        ran = true;
    }
}
test5().then(function(val) {
    console.log(val === "result"); // true
});

// Test 6: finally block runs after catch with await
async function test6() {
    var finallyRan = false;
    try {
        await Promise.reject(new Error("fail"));
    } catch (e) {
        return "caught";
    } finally {
        finallyRan = true;
    }
}
test6().then(function(val) {
    console.log(val === "caught"); // true
});

// Test 7: await inside finally preserves try block's return value
async function test7() {
    try {
        return "from try";
    } finally {
        var x = await Promise.resolve("from finally");
    }
}
test7().then(function(val) {
    console.log(val === "from try"); // true
});

// Test 8: Promise.reject string value is catchable
async function test8() {
    try {
        await Promise.reject("string error");
    } catch (e) {
        return "caught: " + e;
    }
}
test8().then(function(val) {
    console.log(val === "caught: string error"); // true
});

// Test 9: nested try/catch with await
async function test9() {
    try {
        try {
            await Promise.reject(new Error("inner"));
        } catch (e) {
            return "inner caught: " + e.message;
        }
    } catch (e) {
        return "outer caught: " + e.message;
    }
}
test9().then(function(val) {
    console.log(val === "inner caught: inner"); // true
});

// Test 10: uncaught rejection propagates to promise
async function test10() {
    await Promise.reject(new Error("uncaught"));
}
test10().then(
    function() { console.log(false); },
    function(err) { console.log(err.message === "uncaught"); } // true
);
