// The host supplies the canonical key and an ordinary result symbol, not a Symbol global.
let protocolTrace = '';
let protocolOperand = {};
protocolOperand[protocolKey] = function(hint) {
    protocolTrace = protocolTrace + hint + ';';
    if (this !== protocolOperand) throw 'receiver';
    if (hint === 'string') return resultSymbol;
    return 3;
};
let protocolHolder = {};
function protocolBase() {
    protocolTrace = protocolTrace + 'B;';
    return protocolHolder;
}
function protocolKeyExpression() {
    protocolTrace = protocolTrace + 'K;';
    return protocolOperand;
}
function protocolRhs() {
    protocolTrace = protocolTrace + 'R;';
    return 17;
}
protocolBase()[protocolKeyExpression()] = protocolRhs();
let protocolRead = protocolHolder[protocolOperand];
let protocolSum = protocolOperand + 2;
let protocolNegated = -protocolOperand;
let protocolProduct = protocolOperand * 2;
let protocolLess = protocolOperand < 4;
let protocolArray = [8, 9, 10, 11];
protocolArray.length = protocolOperand;
let protocolLike = {'0': 5, '2': 7, length: protocolOperand};
let protocolMapped = protocolMap(protocolLike, function(value) {
    return value * 2;
});
protocolHolder[resultSymbol] = function(argument) {
    protocolTrace = protocolTrace + 'M;';
    if (this !== protocolHolder) throw 'method receiver';
    return argument;
};
function protocolArgument() {
    protocolTrace = protocolTrace + 'A;';
    return 19;
}
let protocolCalled = protocolBase()[protocolKeyExpression()](protocolArgument());
