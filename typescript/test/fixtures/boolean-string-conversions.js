check(falseBox ? true : false);
check(+falseBox === 0);
check(+trueBox === 1);
check(+stringBox === 2);
check(-stringBox === -2);
check(stringBox * 3 === 6);
check(falseBox + 3 === 3);
check(stringBox + 3 === "23");
check(stringBox < 3);
check(stringBox < "3");
let keyed = {};
keyed[falseBox] = 11;
keyed[stringBox] = 22;
check(keyed.false === 11);
check(keyed[2] === 22);
let array = [4, 5, 6];
array.length = stringBox;
check(array.length === 2);
array.length = falseBox;
check(array.length === 0);
check(arrayLikeLength({length: trueBox}) === 1);
check(arrayLikeLength({length: stringBox}) === 2);
let calls = 0;
let mapped = map({"0": 7, "1": 8, length: stringBox}, function(value, index) {
    calls = calls + 1;
    return value + index;
});
check(calls === 2);
check(mapped.length === 2);
check(mapped[0] === 7);
check(mapped[1] === 9);
let effects = "";
function argument() {
    effects = effects + "a";
    return {};
}
check(booleanRoot.toString.call(falseBox, argument(), argument()) === "false");
check(stringRoot.valueOf.call(stringBox, argument()) === "2");
check(effects === "aaa");
let saved = stringRoot.valueOf;
stringRoot.valueOf = function() {
    effects = effects + "v";
    return "4";
};
check(+stringBox === 4);
check(saved.call(stringBox) === "2");
stringRoot.valueOf = saved;
check(+stringBox === 2);
let order = "";
let operand = {toString: function() {
    order = order + "k";
    return "x";
}};
function rhs() {
    order = order + "r";
    return stringBox;
}
keyed[operand] = rhs();
check(order === "rk");
check(keyed.x === stringBox);
let lengthTarget = [1, 2, 3];
function invalidLength() {
    lengthTarget.length = badLength;
}
function invalidBoolean() {
    return booleanRoot.valueOf.call(stringBox);
}
function invalidString() {
    return stringRoot.toString.call(falseBox);
}
function primitiveMember() {
    return "x".toString;
}
