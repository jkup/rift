let negated = !s;
let andValue = s && t;
let orValue = s || t;
let conditional = s ? 1 : 2;
let nanResult = Number.isNaN(s);
let finiteResult = Number.isFinite(s);
let sameDescription = s === t;
let textEqual = s === "Symbol(x)";
function throwSymbol() {
    throw s;
}
