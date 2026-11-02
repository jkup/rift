"use strict";
// DEFERRED: needs arrow functions (outside the TS-001 subset).
// An arrow function has no `this` of its own; it uses the `this` of the
// surrounding function, however the arrow itself is later called.

let owner = {
    name: "owner",
    makeArrow: function () {
        return () => this.name;
    },
    makeFunction: function () {
        return function () {
            return this === undefined ? "no receiver" : this.name;
        };
    }
};

let arrow = owner.makeArrow();
let plain = owner.makeFunction();
let other = { name: "other", arrow: arrow, plain: plain };

console.log(arrow(), other.arrow());
console.log(plain(), other.plain());
