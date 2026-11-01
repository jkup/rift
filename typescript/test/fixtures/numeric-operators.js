let trace = '';
function operand(label, value) {
    return function() {
        trace = trace + label;
        return value;
    };
}
let left = operand('L', '6');
let right = operand('R', '2');
let unary = operand('U', '3');
console.log(left() - right(), left() * right(), left() / right(), left() % right());
console.log(+unary(), -unary());
console.log(trace);
