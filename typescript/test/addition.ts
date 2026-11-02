import { GuestSymbol } from "../src/symbols.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, type Builtin, type Completion, type Value, type ThrowCompletion, type ValueCompletion, type PropertyKey } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void {
    if (!ok) throw new Error(label);
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, { kind: "builtin", realm, invoke });
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

function string(source: string, expected: string): void {
    const realm = new Realm((_line) => {});
    check(execute("let result = " + source + ";", realm).type === "normal", source + " completion");
    const actual = value(realm, "result");
    check(actual.kind === "string" && actual.value === expected, source + " fixed string result");
}
// Each current primitive appears on both sides of string and number partners.
const primitives: { source: string; text: string; sum: number }[] = [
    { source: "undefined", text: "undefined", sum: NaN },
    { source: "null", text: "null", sum: 2 },
    { source: "false", text: "false", sum: 2 },
    { source: "true", text: "true", sum: 3 },
    { source: "6", text: "6", sum: 8 },
    { source: "-0", text: "0", sum: 2 },
    { source: "Number.NaN", text: "NaN", sum: NaN },
    { source: "Number.POSITIVE_INFINITY", text: "Infinity", sum: Infinity },
    { source: "Number.NEGATIVE_INFINITY", text: "-Infinity", sum: -Infinity },
];
for (const row of primitives) {
    string("(" + row.source + ") + 'x'", row.text + "x");
    string("'x' + (" + row.source + ")", "x" + row.text);
    number("(" + row.source + ") + 2", row.sum);
    number("2 + (" + row.source + ")", row.sum);
}
for (const text of ["", "  ", "6", " 6 ", "0x6", "invalid"]) {
    string("'" + text + "' + 2", text + "2");
    string("2 + '" + text + "'", "2" + text);
    string("'" + text + "' + 'x'", text + "x");
    string("'x' + '" + text + "'", "x" + text);
}
const numericEdges: { source: string; expected: number }[] = [
    { source: "-0 + -0", expected: -0 },
    { source: "-0 + 0", expected: 0 },
    { source: "0 + -0", expected: 0 },
    { source: "0 + 0", expected: 0 },
    { source: "null + null", expected: 0 },
    { source: "true + false", expected: 1 },
    { source: "undefined + null", expected: NaN },
    { source: "Number.POSITIVE_INFINITY + Number.NEGATIVE_INFINITY", expected: NaN },
    { source: "Number.MAX_VALUE + Number.MAX_VALUE", expected: Infinity },
    { source: "-Number.MAX_VALUE + -Number.MAX_VALUE", expected: -Infinity },
    { source: "Number.MIN_VALUE + -Number.MIN_VALUE", expected: 0 },
    { source: "Number.MIN_VALUE + Number.MIN_VALUE", expected: 1e-323 },
    { source: "1 + 2 * 3", expected: 7 },
];
for (const row of numericEdges) number(row.source, row.expected);
const formatting: { source: string; expected: string }[] = [
    { source: "Number.MIN_VALUE", expected: "5e-324" },
    { source: "Number.MAX_VALUE", expected: "1.7976931348623157e+308" },
    { source: "0.000001", expected: "0.000001" },
    { source: "0.0000001", expected: "1e-7" },
    { source: "100000000000000000000", expected: "100000000000000000000" },
    { source: "1000000000000000000000", expected: "1e+21" },
    { source: "9007199254740991", expected: "9007199254740991" },
    { source: "0.1 + 0.2", expected: "0.30000000000000004" },
    { source: "1.2345678901234567", expected: "1.2345678901234567" },
];
for (const row of formatting) {
    string("'' + (" + row.source + ")", row.expected);
    string("(" + row.source + ") + ''", row.expected);
}
string("1 + 2 + '3'", "33");
string("'1' + 2 + 3", "123");
string("'x' + 2 * 3", "x6");
string("true ? 1 + '2' : 'no'", "12");

// Inject raw UTF-16 Values, then exercise the real parsed addition expression.
const utfRealm = new Realm((_line) => {});
seed(utfRealm, "left", { kind: "string", value: "A\u0000\ud800" });
seed(utfRealm, "right", { kind: "string", value: "\udfffB" });
check(execute("let utf = left + right;", utfRealm).type === "normal", "UTF-16 completion");
const utf = value(utfRealm, "utf");
check(utf.kind === "string" && utf.value === "A\u0000\ud800\udfffB", "exact UTF-16 concatenation");
check(execute("let lone = left + 1;", utfRealm).type === "normal", "lone surrogate completion");
const lone = value(utfRealm, "lone");
check(lone.kind === "string" && lone.value === "A\u0000\ud8001", "NUL and lone surrogate preserved");
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
for (const expression of ["operand + 2", "2 + operand", "operand + 'x'", "'x' + operand"]) {
    const realm = new Realm((_line) => {});
    const object = new ObservedObject();
    seed(realm, "operand", { kind: "object", object });
    const result = execute(expression + ";", realm);
    check(result === sentinel && object.reads === 1, expression + " exact hook Get throw");
}
for (const op of ["+"]) {
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
// Hook-bearing ordinary objects, arrays and functions convert with exactly one valueOf call.
for (const objectSource of ["{}", "[]", "function() {} "]) {
    for (const expression of ["operand + 2", "2 + operand", "operand + 'x'", "'x' + operand"]) {
        const realm = new Realm((line) => console.log(line));
        const setup = `let operand = ${objectSource};
let hooks = 0;
operand.valueOf = function() {
    hooks = hooks + 1;
    return 6;
};
operand.toString = function() {
    hooks = hooks + 1;
    return '6';
};`;
        check(execute(setup, realm).type === "normal", "hook setup");
        const result = execute("let converted = " + expression + ";", realm);
        check(result.type === "normal", expression + " hook completion");
        const actual = value(realm, "converted");
        if (expression === "operand + 2" || expression === "2 + operand") check(actual.kind === "number" && actual.value === 8, expression);
        else check(actual.kind === "string" && actual.value === (expression === "operand + 'x'" ? "6x" : "x6"), expression);
        const hooks = value(realm, "hooks");
        check(hooks.kind === "number" && hooks.value === 1, "one conversion hook");
    }
}
const realm = new Realm((_line) => {});
check(execute(readFileSync("test/fixtures/addition.js", "utf8"), realm).type === "normal", "runtime-read closure fixture");
const trace = value(realm, "trace");
check(trace.kind === "string" && trace.value === "LRLR", "closure effects once in order");
const first = value(realm, "first");
check(first.kind === "string" && first.value === "12", "closure concatenation");
const second = value(realm, "second");
check(second.kind === "number" && second.value === 3, "closure numeric addition");

// O1-O4: runtime-read expressions preserve evaluation and conversion order.
for (const name of ["add"]) {
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
            return normal({ kind: "string", value: "text" });
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
            check(completion.type === "throw" && completion.diagnostic.phase === "runtime" && completion.diagnostic.name === "TypeError" && completion.diagnostic.message === "cannot convert symbol to string", "symbol operator error");
            check(completion.type === "throw" && completion.diagnostic.loc.line === {"add":2,"subtract":6,"multiply":10,"divide":14,"remainder":18,"less":22,"greater":26,"lessEqual":30,"greaterEqual":34}[name] && completion.diagnostic.loc.column === 12, "symbol operator location");
            check(symbolTrace === "LRH", "symbol operation-specific order");
        }
        check(symbolEvaluator.context.realm === symbolRealm && symbolEvaluator.calls === 0 && symbolEvaluator.depth === 0, "operator cleanup");
    }
}

console.log("addition passed");
