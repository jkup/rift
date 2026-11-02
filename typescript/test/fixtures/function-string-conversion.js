let f = function() {};
let saved = f.toString;
let left = f + 1;
let right = 1 + f;
let positive = +f;
let negative = -f;
let subtract = f - 2;
let multiply = f * 2;
let divide = f / 2;
let remainder = f % 2;
let less = f < 2;
let greater = f > 2;
let lessEqual = f <= 2;
let greaterEqual = f >= 2;
let first = function(){return 1;};
let second = function(){return 2;};
let lexicalLess = first < second;
let lexicalGreaterEqual = first >= second;
let distinct = first === second;
function make(){ return function(){return 1;}; }
let same1 = make();
let same2 = make();
let sameIdentity = same1 === same2;
let keys = {};
keys[same1] = 7;
let literalKey = keys['function(){return 1;}'];
let sameKey = keys[same2];
let differentKey = keys[function() {return 1;}];
let oldTagKey = keys['[object Function]'];
let joined = [f].join();
let array = [1,2];
function invalidLength(){ array.length = f; }
f.toString = function(){return 'override';};
let overridden = f + '';
let original = saved.call(f);
let hoisted = declaration.toString();
function declaration() { /* retained */ return 1; }
function outer() { return function(){return 3;}; }
let later = outer();
let laterText = later.toString();
