function identity(x) {
    return x;
}

function double(x) {
    return x * 2;
}

function empty(x) {
    return undefined;
}

function receiver(x) {
    return this;
}

// Changes below the saved bound are visited; growth beyond it is ignored.
function mutate(x, k, o) {
    if (k === 0) {
        o["1"] = 20;
        o["2"] = 30;
        o["3"] = 40;
        o.length = 4;
    }
    return x;
}

// Shrinking removes own elements, but inherited elements remain visible.
function shrink(x, k, o) {
    if (k === 0) {
        o.length = 1;
    }
    return x;
}

// The counter belongs to the retained closure, not to an evaluator run.
function make() {
    let n = 0;
    return function(x, k, o) {
        n = n + 1;
        host.observe(x, k, o, this, n);
        return x;
    };
}
let saved = make();

function throwing(x, k, o) {
    host.effect(k);
    if (k === 1) {
        throw host.sentinel;
    }
    return x;
}

function recursive(x) {
    return host.__testMapObjectDefaultArray(host.input, recursive);
}

function output(x) {
    console.log(x);
    return x;
}
