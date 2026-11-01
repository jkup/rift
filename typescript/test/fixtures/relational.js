let trace = '';
function makeOperand(mark, result) {
    return function() {
        trace = trace + mark;
        return result;
    };
}
let left = makeOperand('L', '10');
let right = makeOperand('R', '2');
let lt = left() < right();
right = makeOperand('R', 2);
let gt = left() > right();
left = makeOperand('L', null);
right = makeOperand('R', false);
let le = left() <= right();
let ge = left() >= right();
