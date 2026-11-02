import { GuestSymbol } from "../src/symbols.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, type Builtin, type Completion, type Value, type ThrowCompletion, type ValueCompletion, type PropertyKey } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, { kind: "builtin", initialName: null, realm, invoke });
    return { kind: "object", object };
}
function execute(source: string, realm: Realm): Completion {
    const parsed = parse(source);
    if (parsed.error !== null) throw new Error("parse: " + parsed.error.message);
    return new Evaluator(realm).block(parsed.body, realm.global, UNDEFINED);
}
function value(realm: Realm, name: string): Value {
    const binding = realm.global.bindings.get(name);
    if (binding === undefined) throw new Error("missing " + name);
    return binding.value;
}
function number(source: string, expected: number): void {
    const realm = new Realm((line) => console.log(line));
    const result = execute("let result = " + source + ";", realm);
    check(result.type === "normal", source + " completion");
    const actual = value(realm, "result");
    check(actual.kind === "number" && Object.is(actual.value, expected), source + " fixed numeric result");
}

// Columns are unary +, unary -, then left/right inputs for -, *, /, %.
// Expectations are literals, never calculated with the operator under test.
const primitives: { source: string; expected: number[] }[] = [
    { source: "undefined", expected: [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN] },
    { source: "null", expected: [0, -0, -2, 2, 0, 0, 0, Infinity, 0, NaN] },
    { source: "false", expected: [0, -0, -2, 2, 0, 0, 0, Infinity, 0, NaN] },
    { source: "true", expected: [1, -1, -1, 1, 2, 2, 0.5, 2, 1, 0] },
    { source: "6", expected: [6, -6, 4, -4, 12, 12, 3, 0.3333333333333333, 0, 2] },
    { source: "''", expected: [0, -0, -2, 2, 0, 0, 0, Infinity, 0, NaN] },
    { source: "'  '", expected: [0, -0, -2, 2, 0, 0, 0, Infinity, 0, NaN] },
    { source: "' 6 '", expected: [6, -6, 4, -4, 12, 12, 3, 0.3333333333333333, 0, 2] },
    { source: "'0x6'", expected: [6, -6, 4, -4, 12, 12, 3, 0.3333333333333333, 0, 2] },
    { source: "'invalid'", expected: [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN] },
    { source: "'-0'", expected: [-0, 0, -2, 2, -0, -0, -0, -Infinity, -0, NaN] },
    { source: "Number.NaN", expected: [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN] },
    { source: "Number.POSITIVE_INFINITY", expected: [Infinity, -Infinity, Infinity, -Infinity, Infinity, Infinity, Infinity, 0, NaN, 2] },
    { source: "Number.NEGATIVE_INFINITY", expected: [-Infinity, Infinity, -Infinity, Infinity, -Infinity, -Infinity, -Infinity, -0, NaN, 2] },
];
for (const row of primitives) {
    number("+(" + row.source + ")", row.expected[0]);
    number("-(" + row.source + ")", row.expected[1]);
    let column = 2;
    for (const op of ["-", "*", "/", "%"]) {
        number("(" + row.source + ") " + op + " 2", row.expected[column]);
        number("2 " + op + " (" + row.source + ")", row.expected[column + 1]);
        column += 2;
    }
}
const edges: { source: string; expected: number }[] = [
    { source: "-0 - 0", expected: -0 },
    { source: "0 - -0", expected: 0 },
    { source: "-0 - -0", expected: 0 },
    { source: "-1 / 0", expected: -Infinity },
    { source: "-1 / -0", expected: Infinity },
    { source: "0 / 0", expected: NaN },
    { source: "0 / -0", expected: NaN },
    { source: "Number.POSITIVE_INFINITY / Number.POSITIVE_INFINITY", expected: NaN },
    { source: "Number.POSITIVE_INFINITY * 0", expected: NaN },
    { source: "Number.POSITIVE_INFINITY - Number.POSITIVE_INFINITY", expected: NaN },
    { source: "Number.MAX_VALUE * 2", expected: Infinity },
    { source: "Number.MAX_VALUE - -Number.MAX_VALUE", expected: Infinity },
    { source: "Number.MAX_VALUE / 0.5", expected: Infinity },
    { source: "Number.MIN_VALUE / 2", expected: 0 },
    { source: "-Number.MIN_VALUE / 2", expected: -0 },
    { source: "-Number.MIN_VALUE * 0.5", expected: -0 },
    { source: "-5 % 2", expected: -1 },
    { source: "5 % -2", expected: 1 },
    { source: "-4 % 2", expected: -0 },
    { source: "-0 % 2", expected: -0 },
    { source: "-5 % Number.POSITIVE_INFINITY", expected: -5 },
    { source: "1 % -0", expected: NaN },
    { source: "'0b110' - '0o2'", expected: 4 },
    { source: "'1e309' / 2", expected: Infinity },
    { source: "'-1e-999' * 2", expected: -0 },
];
for (const row of edges) number(row.source, row.expected);

const sentinel: ThrowCompletion = {
    type: "throw", value: { kind: "object", object: new GuestObject() },
    diagnostic: { phase: "runtime", name: "Uncaught", message: "sentinel", loc: { line: 31, column: 7 } },
};
class ObservedObject extends GuestObject {
    reads = 0;
    override internalGet(_key: PropertyKey, _receiver: Value, _loc: Location): ValueCompletion {
        this.reads++;
        return sentinel;
    }
}
for (const expression of ["+operand", "-operand", "operand - 2", "2 - operand", "operand * 2", "2 * operand", "operand / 2", "2 / operand", "operand % 2", "2 % operand"]) {
    const realm = new Realm((_line) => {});
    const object = new ObservedObject();
    seed(realm, "operand", { kind: "object", object });
    const result = execute(expression + ";", realm);
    check(result === sentinel && object.reads === 1, expression + " exact hook Get throw");
}
for (const op of ["-", "*", "/", "%"]) {
    const realm = new Realm((line) => console.log(line));
    let order = "";
    seed(realm, "left", builtin(realm, (_receiver, _args, _context, _loc) => {
        order += "L";
        return normal({ kind: "string", value: "6" });
    }));
    seed(realm, "right", builtin(realm, (_receiver, _args, _context, _loc) => {
        order += "R";
        return normal({ kind: "string", value: "2" });
    }));
    seed(realm, "stop", builtin(realm, (_receiver, _args, _context, _loc): Completion => sentinel));
    check(execute("left() " + op + " right();", realm).type === "normal" && order === "LR", op + " order exactly once");
    order = "";
    check(execute("stop() " + op + " right();", realm) === sentinel && order === "", op + " left throw skips RHS");
    check(execute("({}) " + op + " stop();", realm) === sentinel, op + " RHS throw precedes left conversion");
    check(execute("left() " + op + " stop();", realm) === sentinel && order === "L", op + " exact right throw");
    order = "";
    const missing = execute("missing " + op + " right();", realm);
    check(missing.type === "throw" && missing.diagnostic.name === "ReferenceError" && order === "", op + " left GetValue before RHS");
    const rightMissing = execute("({}) " + op + " missing;", realm);
    check(rightMissing.type === "throw" && rightMissing.diagnostic.name === "ReferenceError", op + " right GetValue before conversion");
    const object = new ObservedObject();
    seed(realm, "holder", { kind: "object", object });
    check(execute("holder.x " + op + " right();", realm) === sentinel && order === "", op + " exact left property abrupt");
    check(execute("({}) " + op + " holder.x;", realm) === sentinel && object.reads === 2, op + " exact right property abrupt");
}
for (const op of ["+", "-"]) {
    const realm = new Realm((line) => console.log(line));
    seed(realm, "stop", builtin(realm, (_receiver, _args, _context, _loc): Completion => sentinel));
    check(execute(op + "stop();", realm) === sentinel, "exact unary throw " + op);
}

// Hook-bearing ordinary objects, arrays and functions convert with exactly one valueOf call.
for (const objectSource of ["{}", "[]", "function() {} "]) {
    for (const expression of ["+operand", "-operand", "operand - 2", "2 - operand", "operand * 2", "2 * operand", "operand / 2", "2 / operand", "operand % 2", "2 % operand"]) {
        const realm = new Realm((line) => console.log(line));
        check(execute("let operand = " + objectSource + ";\nlet hooks = 0;\noperand.valueOf = function() { hooks = hooks + 1; return 6; };\noperand.toString = function() { hooks = hooks + 1; return '6'; };", realm).type === "normal", "hook setup");
        const result = execute("let converted = " + expression + ";", realm);
        check(result.type === "normal", expression + " hook completion");
        const actual = value(realm, "converted");
        const expressions = ["+operand", "-operand", "operand - 2", "2 - operand", "operand * 2", "2 * operand", "operand / 2", "2 / operand", "operand % 2", "2 % operand"];
        const expected = [6, -6, 4, -4, 12, 12, 3, 0.3333333333333333, 0, 2];
        check(actual.kind === "number" && Object.is(actual.value, expected[expressions.indexOf(expression)]), expression + " fixed hook result");
        const hooks = value(realm, "hooks");
        check(hooks.kind === "number" && hooks.value === 1, "one conversion hook");
    }
}
// Superseded plus rejections remain explicit positive regressions.
number("null + 1", 1);
const plusRealm = new Realm((_line) => {});
check(execute("let mixedPlus = 1 + '2';", plusRealm).type === "normal", "mixed plus completion");
const mixedPlus = value(plusRealm, "mixedPlus");
check(mixedPlus.kind === "string" && mixedPlus.value === "12", "mixed plus regression");
for (const expression of ["'1' < 2", "true >= 0"]) {
    const comparisonRealm = new Realm((_line) => {});
    const result = execute("let result = " + expression + ";", comparisonRealm);
    const actual = value(comparisonRealm, "result");
    check(result.type === "normal" && actual.kind === "boolean" && actual.value, "primitive relational regression " + expression);
}
const realm = new Realm((line) => console.log(line));
check(execute(readFileSync("test/fixtures/numeric-operators.js", "utf8"), realm).type === "normal", "runtime-read closure fixture");
const trace = value(realm, "trace");
check(trace.kind === "string" && trace.value === "LRLRLRLRUU", "closure order and unary effects");

// O1-O4: runtime-read expressions preserve evaluation and conversion order.
for (const name of ["subtract","multiply","divide","remainder"]) {
    for (const abruptRight of [false, true]) {
        const symbolRealm = new Realm((_line) => {});
        const symbolEvaluator = new Evaluator(symbolRealm);
        let symbolTrace = "";
        const symbolValue: Value = { kind: "symbol", value: new GuestSymbol("x") };
        const symbolLoc: Location = { line: 91, column: 4 };
        const symbolThrow: ThrowCompletion = { type: "throw", value: symbolValue, diagnostic: { phase: "runtime", name: "Sentinel", message: "symbol", loc: symbolLoc } };
        const operand = new GuestObject();
        operand.bootstrapDefine("valueOf", { value: builtin(symbolRealm, (_r, _args, _context, _at) => {
            symbolTrace += "H";
            return normal({ kind: "number", value: 2 });
        }) });
        seed(symbolRealm, "left", builtin(symbolRealm, (_r, _args, _context, _at) => {
            symbolTrace += "L";
            return normal(symbolValue);
        }));
        seed(symbolRealm, "right", builtin(symbolRealm, (_r, _args, _context, _at) => {
            symbolTrace += "R";
            return abruptRight ? symbolThrow : normal({ kind: "object", object: operand });
        }));
        check(execute(readFileSync("test/fixtures/symbol-operators.js", "utf8"), symbolRealm).type === "normal", "symbol operator fixture");
        const completion = symbolEvaluator.call(value(symbolRealm, name), UNDEFINED, [], symbolLoc);
        if (abruptRight) {
            check(completion === symbolThrow && symbolTrace === "LR", "O4 RHS exact throw precedes conversions");
        } else {
            check(completion.type === "throw" && completion.diagnostic.phase === "runtime" && completion.diagnostic.name === "TypeError" && completion.diagnostic.message === "cannot convert symbol to number", "symbol operator error");
            check(completion.type === "throw" && completion.diagnostic.loc.line === {"add":2,"subtract":6,"multiply":10,"divide":14,"remainder":18,"less":22,"greater":26,"lessEqual":30,"greaterEqual":34}[name] && completion.diagnostic.loc.column === 12, "symbol operator location");
            check(symbolTrace === "LR", "symbol operation-specific order");
        }
        check(symbolEvaluator.context.realm === symbolRealm && symbolEvaluator.calls === 0 && symbolEvaluator.depth === 0, "operator cleanup");
    }
}

console.log("numeric operators passed");
