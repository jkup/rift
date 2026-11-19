// DEFERRED: needs `for`, `var`, `const` and array methods (outside the TS-001 subset).
// `for (let …)` creates a fresh binding per iteration, so each closure sees its
// own value. `var` has one function-scoped binding shared by every closure.

const withLet = [];
for (let i = 0; i < 3; i++) {
    withLet.push(function () {
        return i;
    });
}
console.log(withLet[0](), withLet[1](), withLet[2]());

const withVar = [];
for (var j = 0; j < 3; j++) {
    withVar.push(function () {
        return j;
    });
}
console.log(withVar[0](), withVar[1](), withVar[2]());
