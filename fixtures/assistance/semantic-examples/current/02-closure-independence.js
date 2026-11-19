// Each call creates a fresh environment, so closures from different calls are
// independent. Closures created by the same call share one environment.

function makeCounter(start) {
    let count = start;
    return function () {
        count = count + 1;
        return count;
    };
}

let a = makeCounter(0);
let b = makeCounter(100);
console.log(a(), a(), b(), a(), b());

function makeCell() {
    let value = 0;
    return {
        get: function () {
            return value;
        },
        set: function (next) {
            value = next;
        }
    };
}

let first = makeCell();
let second = makeCell();
first.set(7);
console.log(first.get(), second.get());
second.set(9);
console.log(first.get(), second.get());
