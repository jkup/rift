let hits = 0;
let returned = 2.9;
let lengthValue = {
    valueOf: function() {
        hits = hits + 1;
        return returned;
    },
    toString: function() {
        throw 99;
    }
};
let arrayLengthValue = [];
arrayLengthValue.valueOf = lengthValue.valueOf;
arrayLengthValue.toString = lengthValue.toString;
function functionLengthValue() {
    throw 98;
}
functionLengthValue.valueOf = lengthValue.valueOf;
functionLengthValue.toString = lengthValue.toString;
function fallback() {
    hits = hits + 1;
    return returned;
}
function objectResult() {
    hits = hits + 1;
    return {};
}
function identity(value, index, input) {
    hits = hits + 1;
    return value;
}
function mutate() {
    hits = hits + 1;
    input[0] = 10;
    host.remove(input, "1");
    input[3] = 30;
    input.length = 1;
    input.constructor = 7;
    lengthValue = {};
    return 3.9;
}
function nestedLength() {
    return host.length(inner);
}
function nestedMap(value) {
    return host.map(inner, identity).length;
}
function loop() {
    while (true) {}
}
function recursive() {
    return host.length(input);
}
function throwing() {
    hits = hits + 1;
    throw host.payload;
}
