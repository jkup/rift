// Function declarations are initialized before any statement in their scope
// runs, so they can be called "before" their declaration. Function expressions
// assigned to let bindings get no such treatment.

console.log(square(4));

function square(x) {
    return x * x;
}

// Mutual recursion works because both declarations exist up front.
console.log(isEven(10), isOdd(7));

function isEven(n) {
    if (n === 0) {
        return true;
    }
    return isOdd(n - 1);
}

function isOdd(n) {
    if (n === 0) {
        return false;
    }
    return isEven(n - 1);
}

// The same applies inside a function body.
function outer() {
    return helper() + 1;
    function helper() {
        return 41;
    }
}
console.log(outer());
