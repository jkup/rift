// Variables hold references to objects. Two bindings can refer to one object;
// rebinding a variable never changes the object another binding refers to.

let original = { n: 1 };
let alias = original;
alias.n = 2;
console.log(original.n, original === alias);

alias = { n: 3 };
console.log(original.n, alias.n, original === alias);

// Arguments are passed by value, and that value may be a reference.
function mutate(target) {
    target.n = 10;
}
function rebind(target) {
    target = { n: 20 };
    return target.n;
}
mutate(original);
console.log(original.n);
console.log(rebind(original), original.n);

// Structurally equal objects are still distinct.
console.log({ n: 10 } === { n: 10 });
