function check(ok) {
    if (!ok) throw 'delete assertion';
}
let o = {x: 7};
check(delete (o.x = 9));
check(o.x === 9);
let result = delete o.x;
check(result == true);
check(result === true);
check(!result === false);
check(result ? true : false);
let a = [1, 2, 3];
check(delete a[1]);
check(a.length === 3);
check(a.join() === '1,,3');
function f() { /*keep*/ return delete this.x; }
check(f.toString() === 'function f() { /*keep*/ return delete this.x; }');
o.x = 1;
check(f.call(o));
check(o.x === undefined);
function outer() { /* delete text */ return function() { return 'delete'; }; }
check(outer.toString() === "function outer() { /* delete text */ return function() { return 'delete'; }; }");
check(outer().toString() === "function() { return 'delete'; }");
let key = {toString: function() { return 'x'; }};
o.x = 2;
let saved = key.toString;
check(delete key.toString);
check(saved() === 'x');
check(key.toString() === '[object Object]');
check(delete o[key]);
check(o.x === 2);
