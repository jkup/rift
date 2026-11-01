let trace = '';
function makeOperand(label, input) {
    return function() {
        trace = trace + label;
        return input;
    };
}
let left = makeOperand('L', 1);
let right = makeOperand('R', '2');
let first = left() + right();
right = makeOperand('R', 2);
let second = left() + right();
