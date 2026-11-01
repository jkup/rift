let empty = [];
let oneHole = [,];
let twoHoles = [,,];
let trailing = [1,];
let trailingHole = [1,,];
let mixed = [, undefined, null,,];
console.log(empty.length, oneHole.length, twoHoles.length, trailing.length, trailingHole.length);
console.log(mixed.length, mixed['0'], mixed['1'], mixed['2'], mixed['3']);
let shared = { value: 7 };
function make() {
    return [shared];
}
let first = make();
let second = make();
console.log(first === second, first['0'] === second['0']);
let order = 0;
function next() {
    order = order + 1;
    return order;
}
let elements = [next(), order = order + 10, true ? next() : 99, function(x) { return x + 1; }];
console.log(elements['0'], elements['1'], elements['2'], order, elements['3'](4));
let nested = [[1,,], { inner: shared }, false ? 0 : [2]];
console.log(nested['0'].length, nested['1'].inner === shared, nested['2']['0']);
let grown = [3];
grown['4'] = 9;
console.log(grown.length, grown['1'], grown['4']);
let shrunk = [1, 2, 3];
shrunk.length = 1;
console.log(shrunk.length, shrunk['1']);
