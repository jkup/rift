// A closure keeps its defining environment alive and shares the binding,
// not a copy of the value at creation time.

function makeCounter() {
    let count = 0;
    return function () {
        count = count + 1;
        return count;
    };
}

let next = makeCounter();
console.log(next());
console.log(next());
console.log(next());

// The closure observes assignments made after it was created.
let message = "before";
let read = function () {
    return message;
};
message = "after";
console.log(read());
