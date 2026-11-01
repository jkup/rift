let trace = '';
let leftValue = 6;
let rightValue = 2;
let leftObject = {};
let rightObject = {};
leftObject.valueOf = function(unused) {
    trace = trace + 'P';
    verify(this === leftObject && unused === undefined);
    return leftValue;
};
leftObject.toString = function() { throw 'wrong hint'; };
rightObject.valueOf = function(unused) {
    trace = trace + 'Q';
    verify(this === rightObject && unused === undefined);
    return rightValue;
};
rightObject.toString = function() { throw 'wrong hint'; };
function left() {
    trace = trace + 'L';
    return leftObject;
}
function right() {
    trace = trace + 'R';
    return rightObject;
}
let count = 0;
let counter = {valueOf: function() {
    count = count + 1;
    return count;
}};
let nested = {valueOf: function() { return +counter + 12; }};
let looping = {valueOf: function() { while (true) {} }};
let recursive = {valueOf: function() { return +recursive; }};
