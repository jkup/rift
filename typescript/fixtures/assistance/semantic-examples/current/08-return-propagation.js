// `return` leaves the whole function immediately, even from inside nested
// blocks and loops. Falling off the end, or a bare return, produces undefined.

function findFirstOver(limit) {
    let i = 0;
    while (true) {
        i = i + 1;
        if (i * i > limit) {
            {
                return i;
            }
        }
    }
}
console.log(findFirstOver(10));

let afterReturn = "not reached";
function stopsEarly() {
    return "early";
    afterReturn = "reached";
}
console.log(stopsEarly(), afterReturn);

function noReturn() {
    let unused = 1;
}
function bareReturn() {
    return;
}
console.log(noReturn(), bareReturn());

// A return value flows out through every caller unchanged.
function inner() {
    return { tag: "inner" };
}
function middle() {
    return inner();
}
let result = middle();
console.log(result.tag, middle() === middle());

// Returning from an inner function does not return from the outer one.
function outer() {
    let helper = function () {
        return "helper";
    };
    helper();
    return "outer";
}
console.log(outer());
