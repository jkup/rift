// Test 1: Basic async class instance method
class Fetcher {
    async getData() {
        return 42;
    }
}
var f = new Fetcher();
f.getData().then(function(val) {
    console.log(val === 42); // true
});

// Test 2: Async class method with await
class AsyncCalc {
    async add(a, b) {
        var x = await Promise.resolve(a);
        var y = await Promise.resolve(b);
        return x + y;
    }
}
var calc = new AsyncCalc();
calc.add(3, 4).then(function(val) {
    console.log(val === 7); // true
});

// Test 3: Async static method
class Utils {
    static async fetch(val) {
        return await Promise.resolve(val);
    }
}
Utils.fetch("hello").then(function(val) {
    console.log(val === "hello"); // true
});

// Test 4: Async method in object literal
var obj = {
    async greet(name) {
        var result = await Promise.resolve("Hello " + name);
        return result;
    }
};
obj.greet("World").then(function(val) {
    console.log(val === "Hello World"); // true
});

// Test 5: this binding in async class method
class Counter {
    constructor() {
        this.count = 0;
    }
    async increment() {
        this.count = this.count + 1;
        return await Promise.resolve(this.count);
    }
}
var c = new Counter();
c.increment().then(function(val) {
    console.log(val === 1); // true
});

// Test 6: Async method rejection
class ErrorClass {
    async fail() {
        throw new Error("async error");
    }
}
var e = new ErrorClass();
e.fail().then(
    function() { console.log(false); },
    function(err) { console.log(err.message === "async error"); } // true
);

// Test 7: Regular method shorthand in object literal
var math = {
    double(x) {
        return x * 2;
    }
};
console.log(math.double(5) === 10); // true

// Test 8: Object literal async method returning non-promise
var simple = {
    async getValue() {
        return "sync value";
    }
};
simple.getValue().then(function(val) {
    console.log(val === "sync value"); // true
});
