"use strict";
// `this` is decided by how a function is called, not where it was defined.
// The directive makes Node match Rift's strict-call profile for detached calls.

function describe() {
    return this.name;
}

let left = { name: "left", describe: describe };
let right = { name: "right", describe: describe };
console.log(left.describe(), right.describe());

// Copying a method to another object changes the receiver.
right.borrowed = left.describe;
console.log(right.borrowed());

// Computed member calls pass the object as the receiver too.
console.log(left["describe"]());

// A plain call has no receiver: `this` is undefined in strict code.
let detached = left.describe;
let whoAmI = function () {
    return this;
};
console.log(whoAmI() === undefined);
console.log(left.describe === detached);
