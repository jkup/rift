function check(ok) {
    if (!ok) throw 'array consumer assertion';
}
let empty = [];
let pair = [1, 2];
let two = [2];
let three = [3];
check(empty + '' === '');
check(pair + '' === '1,2');
check(+empty === 0);
check(1 / +empty === Infinity);
check(+two === 2);
check(Number.isNaN(+pair));
check(empty == 0);
check(!(empty != 0));
check(two * 3 === 6);
check(two < three);
let object = {};
object[empty] = 7;
check(object[''] === 7);
object[pair] = 9;
check(object['1,2'] === 9);
check(object[empty] === 7);
// C3 deletion is checked through the host internalDelete interface.
let trace = '';
pair.join = function() {
    trace = trace + 'key;';
    return 'method';
};
object.method = function(value) {
    check(this === object);
    trace = trace + 'call;';
    return value;
};
function argument() {
    trace = trace + 'arg;';
    return 42;
}
check(object[pair](argument()) === 42);
check(trace === 'key;arg;call;');
