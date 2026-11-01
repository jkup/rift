// A while condition is re-evaluated before every iteration, including its side
// effects. `continue` jumps to the condition; `break` skips it.

let checks = 0;
function keepGoing(i) {
    checks = checks + 1;
    return i < 3;
}

let i = 0;
while (keepGoing(i)) {
    i = i + 1;
}
console.log(i, checks);

// continue re-tests the condition; the rest of the body is skipped.
let tested = 0;
let summed = 0;
let n = 0;
while (n < 6) {
    tested = tested + 1;
    n = n + 1;
    if (n % 2 === 0) {
        continue;
    }
    summed = summed + n;
}
console.log(tested, summed);

// break leaves without evaluating the condition again.
checks = 0;
i = 0;
while (keepGoing(i)) {
    i = i + 1;
    if (i === 2) {
        break;
    }
}
console.log(i, checks);

// A loop body that never runs still evaluates the condition once.
checks = 0;
while (keepGoing(10)) {
    console.log("never printed");
}
console.log(checks);
