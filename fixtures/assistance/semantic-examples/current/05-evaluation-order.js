// Operands, arguments and member keys are evaluated left to right, and an
// assignment's target object and key are evaluated before its right-hand side.

function note(label, value) {
    console.log(label);
    return value;
}

function add3(a, b, c) {
    return a + b + c;
}

console.log(add3(note("arg 1", 1), note("arg 2", 2), note("arg 3", 3)));

console.log(note("left", 2) * note("right", 5));

let box = { slot: 0 };
note("target", box)[note("key", "slot")] = note("value", 42);
console.log(box.slot);

// The callee expression is evaluated before the arguments.
let calls = { run: function (x) { return x; } };
console.log(note("callee", calls).run(note("argument", "done")));

// Short-circuiting skips the right operand entirely.
console.log(note("and-left", false) && note("and-right", true));
console.log(note("or-left", 1) || note("or-right", 2));
