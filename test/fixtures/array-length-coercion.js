let hits = 0;
let trace = "";
let first = 2;
let second = 2;
let rhs = {
    valueOf: function() {
        hits = hits + 1;
        trace = trace + "v";
        host.effect(hits);
        if (hits === 1) return first;
        return second;
    },
    toString: function() {
        hits = hits + 1;
        trace = trace + "s";
        return second;
    }
};
let arrayRhs = [];
arrayRhs.valueOf = rhs.valueOf;
arrayRhs.toString = rhs.toString;
function functionRhs() {
    return 0;
}
functionRhs.valueOf = rhs.valueOf;
functionRhs.toString = rhs.toString;
function replacement() {
    hits = hits + 1;
    trace = trace + "r";
    return second;
}
function objectResult() {
    trace = trace + "o";
    return {};
}
function assign() {
    return target.length = rhs;
}
function loop() {
    while (true) {}
}
function recursive() {
    return target.length = rhs;
}
function nested() {
    hits = hits + 1;
    other.length = inner;
    return 2;
}
function reentrant() {
    hits = hits + 1;
    if (hits === 1) target.length = inner;
    return 2;
}
function throwing() {
    throw host.payload;
}
function rhsFailure() {
    target.length = throwing();
}
function keyFailure() {
    target[badKey] = rhs;
}
function compound() {
    hits = hits + 1;
    let key = { toString: function() { return "note"; } };
    target[key] = +inner;
    host.map();
    return 2;
}
