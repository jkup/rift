function run(value, box, radix, expected) {
    check(value.toString(radix) === expected);
    check(box.toString(radix) === expected);
    check(root.toString.call(value, radix) === expected);
    let order = "";
    function argument(text, result) {
        order = order + text;
        return result;
    }
    check(root.toString.call(value, argument("a", radix), argument("b", {})) === expected);
    check(order === "ab");
    let keyed = {};
    keyed[box] = 7;
    check(keyed[box.toString()] === 7);
    check(box + "" === box.toString());
    check([box].toString() === box.toString());
    check(box.toString(10) === box.toString());
}
function invalidRadix() {
    return root.toString.call(NaN, 1);
}
function invalidStringReceiver() {
    return root.toString.call({}, {valueOf: function() { throw "must not run"; }});
}
function failArgument() {
    throw "early radix argument";
}
function earlyArgument() {
    return root.toString.call({}, failArgument());
}
