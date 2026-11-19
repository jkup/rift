let object = {};
let array = [,,];
function declared() { return object; }
let expression = function () { return {}; };
let nested = { object: object, array: [object], fn: declared };
function fresh() { return [{}, [], function () {}]; }
let first = fresh();
let second = fresh();
let inheritedX = object.x;
let inheritedY = declared.y;
let inheritedZ = array.z;
object.x = 10;
let shadow = object.x;
let effects = 0;
function readonlyWrite() { object.fixed = effects = effects + 1; }
function numericObject() { return +{}; }
function numericArray() { return +[]; }
function numericFunction() { return +function () {}; }
function additionObject() { return {} + 1; }
function additionArray() { return [] + 1; }
function additionFunction() { return expression + 1; }
function keyObject() { return object[{}]; }
function keyArray() { return object[[]]; }
function keyFunction() { return object[expression]; }
function lengthObject() { array.length = {}; }
function lengthArray() { array.length = []; }
function lengthFunction() { array.length = expression; }
function numberCall() { return Number(); }
