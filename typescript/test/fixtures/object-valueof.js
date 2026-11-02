let target = {};
let saved = target.valueOf;
let direct = target.valueOf() === target;
let array = [];
let arrayIdentity = array.valueOf() === array;
function identity() {
    return this;
}
let functionIdentity = identity.valueOf() === identity;
let borrowed = saved.call(target) === target;
let stringBox = saved.call('ab');
let freshStringBox = saved.call('ab');
let fresh = stringBox !== freshStringBox;
let units = stringBox[0] === 'a' && stringBox[1] === 'b' && stringBox.length === 2;
let shadow = { valueOf: function() { return 17; } };
let shadowed = shadow.valueOf() === 17;
let bypass = saved.call(shadow) === shadow;
let trace = '';
function effect(mark) {
    trace = trace + mark;
    return target;
}
function detachedFailure() {
    saved(effect('a'), effect('b'));
    trace = trace + 'unreachable';
}
function nullFailure() {
    saved.call(null, effect('c'), effect('d'));
    trace = trace + 'unreachable';
}
function missingFailure() {
    saved.call();
}
function abruptArgument() {
    saved.call(null, effect('e'), stop(), effect('unreachable'));
}
