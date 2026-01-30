// Test for-await-of loops (async iteration)

// Test 1: for-await-of with array of Promises
async function test1() {
    var results = [];
    var promises = [
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3)
    ];

    for await (const val of promises) {
        results.push(val);
    }

    return results;
}
test1().then(function(results) {
    console.log(results.length === 3);  // true
    console.log(results[0] === 1);      // true
    console.log(results[1] === 2);      // true
    console.log(results[2] === 3);      // true
});

// Test 2: for-await-of with let declaration
async function test2() {
    var results = [];
    var promises = [
        Promise.resolve("a"),
        Promise.resolve("b")
    ];

    for await (let val of promises) {
        results.push(val);
    }

    return results;
}
test2().then(function(results) {
    console.log(results.length === 2);     // true
    console.log(results[0] === "a");       // true
    console.log(results[1] === "b");       // true
});

// Test 3: for-await-of with break
async function test3() {
    var results = [];
    var promises = [
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
        Promise.resolve(4)
    ];

    for await (const val of promises) {
        results.push(val);
        if (val === 2) {
            break;
        }
    }

    return results;
}
test3().then(function(results) {
    console.log(results.length === 2);  // true
    console.log(results[0] === 1);      // true
    console.log(results[1] === 2);      // true
});

// Test 4: for-await-of with empty iterable
async function test4() {
    var count = 0;
    var items = [];

    for await (const val of items) {
        count++;
    }

    return count;
}
test4().then(function(count) {
    console.log(count === 0);  // true
});

// Test 5: for-await-of with plain (non-Promise) array
async function test5() {
    var results = [];
    var items = [10, 20, 30];

    for await (const val of items) {
        results.push(val);
    }

    return results;
}
test5().then(function(results) {
    console.log(results.length === 3);     // true
    console.log(results[0] === 10);        // true
    console.log(results[1] === 20);        // true
    console.log(results[2] === 30);        // true
});

// Test 6: for-await-of with mixed Promise and non-Promise values
async function test6() {
    var results = [];
    var items = [
        Promise.resolve(10),
        20,
        Promise.resolve(30)
    ];

    for await (const val of items) {
        results.push(val);
    }

    return results;
}
test6().then(function(results) {
    console.log(results.length === 3);     // true
    console.log(results[0] === 10);        // true
    console.log(results[1] === 20);        // true
    console.log(results[2] === 30);        // true
});
