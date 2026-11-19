// Read by the compiled host driver at runtime; results are asserted there.
function receiver() { return this; }
function identity(x) { return x; }
function missing(a, b) { return a === undefined && b === undefined; }
function throwValue(x) { throw x; }
function recurse() { return recurse.call(null); }
let count = 0;
let trace = '';
function effect(label, value) {
    trace = trace + label;
    return value;
}
function target(a, b) {
    count = count + 1;
    return this === token && a === first && b === second;
}
let token = {};
let first = {};
let second = {};
let saved = target.call;
let ordered = effect('b', target)[effect('p', 'call')](effect('t', token), effect('a', first), effect('z', second), effect('e', 99));
let chained = saved.call(target, token, first, second);
let noArgs = missing.call();
let noReceiver = receiver.call();
target.call = 17;
let bypass = saved.call(target, token, first, second);
function detached() { return saved(effect('d', token), effect('x', first)); }
function borrowed(x) { return saved.call(x, effect('t', token), effect('a', first)); }
function baseFailure() { return absent[effect('p', 'call')](effect('a', first)); }
function propertyFailure() { return target[absent](effect('a', first)); }
function argumentFailure() { return saved.call(target, effect('t', token), absent, effect('z', second)); }
function guestBridge(f, x) { return f.call(this, x); }
function makeForeign() {
    let captured = token;
    return function() {
        return { captured: captured, receiver: this, array: [], fn: function() {} };
    };
}
let foreign = makeForeign();
