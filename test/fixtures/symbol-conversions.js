let effects = 0;
function extra() { effects = effects + 1; return ignored; }
let text = box.toString(extra());
let unboxed = box.valueOf(extra());
let primitive = symbolRoot.valueOf.call(s);
let hintIgnored = box[hookKey](extra(), extra());
let target = {};
target[box] = 17;
let keyResult = target[s];

function numeric() {
    return -box;
}
function implicitString() {
    return "" + box;
}
function invalidRoot() {
    return symbolRoot.valueOf();
}
function implicitMember() {
    return s.valueOf;
}
function readonlyHook() {
    box[hookKey] = symbolRoot.valueOf;
}
