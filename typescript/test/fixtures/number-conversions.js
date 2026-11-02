check(box ? true : false);
check(box !== 2);
check(box === box);
check(box + 3 === 5);
check(3 + box === 5);
check(box + "x" === "2x");
check("x" + box === "x2");
check(+box === 2);
check(-box === -2);
check(box * 3 === 6);
check(box < 3);
check(1 / +negativeZero === -Number.POSITIVE_INFINITY);
check(1 / +positiveZero === Number.POSITIVE_INFINITY);
check(1 / -negativeZero === Number.POSITIVE_INFINITY);
check(negativeZero + "x" === "0x");
check(Number.isNaN(+nanBox));
check(nanBox + "x" === "NaNx");
check(!(nanBox < 3));
check(!(nanBox > 3));
check(!(nanBox <= 3));
check(!(nanBox >= 3));
check(+infinite === Number.POSITIVE_INFINITY);
check(-infinite === Number.NEGATIVE_INFINITY);
check(infinite > 3);
check(infinite + "x" === "Infinityx");
let keyed = {};
keyed[box] = 7;
check(keyed["2"] === 7);
let array = [10, 20, 30];
array.length = box;
check(array.length === 2);
check(array[2] === undefined);
array.length = negativeZero;
check(1 / array.length === Number.POSITIVE_INFINITY);
check(arrayLikeLength({length: fraction}) === 2);
check(arrayLikeLength({length: negative}) === 0);
let order = "";
let mapped = map({"0": 10, "1": 20, length: box}, function(value, index) {
    order = order + index;
    return value + 1;
});
check(order === "01");
check(mapped.length === 2);
check(mapped[0] === 11);
check(mapped[1] === 21);
let effects = "";
function argument() {
    effects = effects + "a";
    return {};
}
check(root.valueOf.call(box, argument(), argument()) === 2);
check(effects === "aa");
let saved = root.valueOf;
root.valueOf = function() {
    effects = effects + "v";
    return 4;
};
check(+box === 4);
check(saved.call(box) === 2);
check(effects === "aav");
root.valueOf = saved;
let operand = {toString: function() {
    effects = effects + "k";
    return "method";
}};
function rhs() {
    effects = effects + "r";
    return box;
}
keyed[operand] = rhs();
check(effects === "aavrk");
check(keyed.method === box);
let target = [1, 2, 3];
function invalidLength() {
    target.length = fraction;
}
function invalidReceiver() {
    return root.valueOf.call({});
}
function primitiveMember() {
    return (2).valueOf;
}
function namespaceCall() {
    return Number();
}
function failingArgument() {
    throw "argument sentinel";
}
function argumentFirst() {
    return root.valueOf.call({}, failingArgument());
}
function bothObjects() {
    return +{valueOf: function() {
        return {};
    }, toString: function() {
        return {};
    }};
}
