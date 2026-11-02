// Runtime-read source: literal assertions, source-ordered effects, no host evaluation.
function check(ok) {
    if (!ok) throw 'equality fixture assertion';
}
function pair(x, y, answer) {
    check((x == y) === answer);
    check((y == x) === answer);
    check((x != y) === !answer);
    check((y != x) === !answer);
}
pair([], 0, true);
pair([], '', true);
pair([], false, true);
pair([1], 1, true);
pair([1, 2], '1,2', true);
pair([1, 2], 0, false);
pair([,], 0, true);
pair([null], 0, true);
pair([undefined], 0, true);
pair([[1]], 1, true);
let f = function() { return 1; };
pair(f, 'function() { return 1; }', true);
pair(f, 0, false);
pair(console.log, 'function log() { [native code] }', true);
// Public name mutation is exercised through host descriptor setup.
pair(f, 'function() { return 1; }', true);
f.toString = function() { return '2'; };
pair(f, 2, true);
pair({}, '[object Object]', true);
pair({}, 0, false);
check(1 == '1');
check(!(1 != '1'));
check(!(1 === '1'));
check(1 !== '1');
check(1 == 1 == true);
check(0 == 0 !== false);
check(!(1 + 1 == 2 < 3));
check(false == 0 && true);
check(true || missing == 0);
check((0 == false ? 7 : missing) === 7);
let assigned;
assigned = 0 == false;
check(assigned === true);
check(!0 == true);
check(1/*a*/==/*b*/'1');
check(!(1 != !0));

let trace = '';
let target = {};
target[protocol] = function(hint) {
    trace = trace + 'P:' + hint + ';';
    return 1;
};
function leftObject() {
    trace = trace + 'L;';
    return target;
}
function rightNumber() {
    trace = trace + 'R;';
    return 1;
}
function leftNumber() {
    trace = trace + 'L;';
    return 1;
}
function rightObject() {
    trace = trace + 'R;';
    return target;
}
check(leftObject() == rightNumber());
check(trace === 'L;R;P:default;');
trace = '';
check(!(leftObject() != rightNumber()));
check(trace === 'L;R;P:default;');
trace = '';
check(leftNumber() == rightObject());
check(trace === 'L;R;P:default;');
trace = '';
check(!(leftNumber() != rightObject()));
check(trace === 'L;R;P:default;');

function replace() {
    trace = trace + 'R;';
    target[protocol] = function(hint) {
        trace = trace + 'new:' + hint + ';';
        return 2;
    };
    return 2;
}
trace = '';
check(leftObject() == replace());
check(trace === 'L;R;new:default;');
trace = '';
check(!(leftObject() != replace()));
check(trace === 'L;R;new:default;');
let captured = 1;
function changeBinding() {
    trace = trace + 'R;';
    captured = 2;
    return 1;
}
trace = '';
check(captured == changeBinding());
check(captured === 2 && trace === 'R;');
captured = 1;
trace = '';
check(!(captured != changeBinding()));
check(captured === 2 && trace === 'R;');
let original = target;
function rebind() {
    trace = trace + 'R;';
    target = {};
    return original;
}
trace = '';
check(leftObject() == rebind());
check(trace === 'L;R;');
target = original;
trace = '';
check(!(leftObject() != rebind()));
check(trace === 'L;R;');

let key = {};
key[protocol] = function(hint) {
    trace = trace + 'K:' + hint + ';';
    return 'x';
};
let container = {};
container.x = original;
original[protocol] = function(hint) {
    trace = trace + 'P:' + hint + ';';
    return 1;
};
trace = '';
check(container[key] == rightNumber());
check(trace === 'K:string;R;P:default;');
trace = '';
check(!(container[key] != rightNumber()));
check(trace === 'K:string;R;P:default;');
trace = '';
check(leftNumber() == container[key]);
check(trace === 'L;K:string;P:default;');
trace = '';
check(!(leftNumber() != container[key]));
check(trace === 'L;K:string;P:default;');

// Mirrored mutation cases keep source order; moving the binding read changes O7/O8.
function replaceLeft() {
    trace = trace + 'L;';
    target[protocol] = function(hint) {
        trace = trace + 'new:' + hint + ';';
        return 2;
    };
    return 2;
}
trace = '';
check(replaceLeft() == rightObject());
check(trace === 'L;R;new:default;');
trace = '';
check(!(replaceLeft() != rightObject()));
check(trace === 'L;R;new:default;');
captured = 1;
trace = '';
check(!(changeBinding() == captured));
check(trace === 'R;' && captured === 2);
captured = 1;
trace = '';
check(changeBinding() != captured);
check(trace === 'R;' && captured === 2);
function rebindLeft() {
    trace = trace + 'L;';
    target = {};
    return original;
}
target = original;
trace = '';
check(!(rebindLeft() == rightObject()));
check(trace === 'L;R;');
target = original;
trace = '';
check(rebindLeft() != rightObject());
check(trace === 'L;R;');
