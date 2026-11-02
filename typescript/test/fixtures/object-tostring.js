// Read at runtime in both lanes. No guest Object/Symbol globals are required.
let ordinary = {};
check(ordinary.toString() === '[object Object]');
check(ordinary + 2 === '[object Object]2');
check(Number.isNaN(+ordinary));
check(Number.isNaN(ordinary * 2));
check((ordinary < 2) === false);
check((ordinary >= 2) === false);
check([] + '' === '[object Array]');
check(function() {} + '' === '[object Function]');
let table = {};
table[ordinary] = 17;
check(table['[object Object]'] === 17);
check(table[{}] === 17);
check(arrayLikeLength({length: {}}) === 0);
let callbackHits = 0;
let mapped = map({length: {}, '0': 1}, function() { callbackHits = callbackHits + 1; });
check(mapped.length === 0);
check(callbackHits === 0);

let trace = '';
let key = {};
function base() {
    trace = trace + 'B';
    return table;
}
function keyExpression() {
    trace = trace + 'K';
    return key;
}
function rhs() {
    trace = trace + 'R';
    key[tagKey] = 'Updated';
    return 23;
}
base()[keyExpression()] = rhs();
check(trace === 'BKR');
check(table['[object Updated]'] === 23);
trace = '';
check(base()[keyExpression()] === 23);
check(trace === 'BK');
table['[object Updated]'] = function(x) {
    trace = trace + 'C';
    check(this === table);
    return x;
};
function argument() {
    trace = trace + 'A';
    key[tagKey] = 'TooLate';
    return 29;
}
trace = '';
check(base()[keyExpression()](argument()) === 29);
check(trace === 'BKAC');

let effects = 0;
function extra() {
    effects = effects + 1;
    return {};
}
check(savedToString.call(null, extra(), extra()) === '[object Null]');
check(effects === 2);
check(savedToString.call(undefined) === '[object Undefined]');
ordinary[tagKey] = '';
check(ordinary.toString() === '[object ]');
ordinary[tagKey] = 7;
check(ordinary.toString() === '[object Object]');

let changing = {valueOf: function() {
    this.toString = function() { return 'changed'; };
    return this;
}};
check(changing + '' === 'changed');
objectRoot.toString = function() { return 'replacement'; };
check({} + '' === 'replacement');
objectRoot.toString = savedToString;
check({} + '' === '[object Object]');
function bothObjects() {
    return +{
        valueOf: function() { return {}; },
        toString: function() { return []; }
    };
}
function nullRoot() {
    return +bare;
}
let lengthTarget = [1, 2, 3];
function invalidLength() {
    lengthTarget.length = {};
}
function primitiveMember() {
    return 'x'.toString();
}
