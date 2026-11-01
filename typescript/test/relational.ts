import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { GuestObject, UNDEFINED, normal, type Builtin, type Completion, type Value, type ThrowCompletion, type ValueCompletion, type PropertyKey } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void {
    if (!ok) throw new Error(label);
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function builtin(invoke: Builtin): Value {
    const object = new GuestObject();
    object.callable = { kind: "builtin", invoke };
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

// Fixed expectations are ordered <, >, <=, >=; never derived from the helper.
function row(left: string, right: string, expected: boolean[]): void {
    const operators = ["<", ">", "<=", ">="];
    for (let i = 0; i < operators.length; i++) {
        const source = "(" + left + ") " + operators[i] + " (" + right + ")";
        const realm = new Realm((_line) => {});
        const result = execute("let result = " + source + ";", realm);
        const actual = value(realm, "result");
        check(result.type === "normal" && actual.kind === "boolean"
            && actual.value === expected[i], source + " fixed result");
    }
}
const less = [true, false, true, false];
const greater = [false, true, false, true];
const same = [false, false, true, true];
const unordered = [false, false, false, false];
for (const source of ["null", "false", "true", "0", "-0", "''", "'  '", "'1'", "'0x1'", "'0b1'", "'0o1'"]) {
    row(source, "2", less);
    row("2", source, greater);
}
for (const source of ["undefined", "Number.NaN", "'invalid'", "'1_0'"]) {
    row(source, "2", unordered);
    row("2", source, unordered);
}
row("'10'", "'2'", less);
row("'2'", "'10'", greater);
row("'10'", "2", greater);
row("2", "'10'", less);
row("'invalid'", "'z'", less);
row("'  '", "''", greater);
for (const source of ["'0x10'", "'0b10000'", "'0o20'", "' 16 '"]) {
    row(source, "16", same);
    row("16", source, same);
}
for (const source of ["0", "-0", "null", "false", "''"]) {
    row(source, "-0", same);
    row("-0", source, same);
}
row("true", "1", same);
row("1", "true", same);
row("Number.NaN", "Number.NaN", unordered);
row("undefined", "null", unordered);
row("null", "undefined", unordered);
row("Number.NEGATIVE_INFINITY", "-Number.MAX_VALUE", less);
row("-Number.MAX_VALUE", "Number.NEGATIVE_INFINITY", greater);
row("Number.MAX_VALUE", "Number.POSITIVE_INFINITY", less);
row("Number.POSITIVE_INFINITY", "Number.MAX_VALUE", greater);
row("0", "Number.MIN_VALUE", less);
row("Number.MIN_VALUE", "0", greater);
for (const source of ["2", "Number.MAX_VALUE", "Number.MIN_VALUE", "Number.POSITIVE_INFINITY", "Number.NEGATIVE_INFINITY"]) {
    row(source, source, same);
    row(source, "Number.NaN", unordered);
    row("Number.NaN", source, unordered);
}
// Inject raw UTF-16 to avoid depending on the guest's limited escape grammar.
const strings: { left: string; right: string; expected: boolean[] }[] = [
    { left: "", right: "", expected: same },
    { left: "", right: "a", expected: less },
    { left: "a", right: "", expected: greater },
    { left: "a", right: "ab", expected: less },
    { left: "ab", right: "a", expected: greater },
    { left: "abc", right: "abc", expected: same },
    { left: "a\u0000", right: "a", expected: greater },
    { left: "a\u0000b", right: "a\u0000c", expected: less },
    { left: "\ud800", right: "\ud801", expected: less },
    { left: "\udfff", right: "\ud800", expected: greater },
    { left: "\ud800", right: "\ud800", expected: same },
    { left: "\ud800\udc00", right: "\ue000", expected: less },
    { left: "\ue000", right: "\ud800\udc00", expected: greater },
    { left: "\ud800", right: "\ud800\udc00", expected: less },
    { left: "\ud83d\ude00", right: "\ud83d\ude01", expected: less },
];
for (const entry of strings) {
    const operators = ["<", ">", "<=", ">="];
    for (let i = 0; i < operators.length; i++) {
        const realm = new Realm((_line) => {});
        seed(realm, "left", { kind: "string", value: entry.left });
        seed(realm, "right", { kind: "string", value: entry.right });
        const result = execute("let result = left " + operators[i] + " right;", realm);
        const actual = value(realm, "result");
        check(result.type === "normal" && actual.kind === "boolean"
            && actual.value === entry.expected[i], "fixed UTF-16 row " + i);
    }
}
for (const source of ["'1' !== 1", "null !== undefined", "0 === -0", "Number.NaN !== Number.NaN", "1 + 2 < 4", "1 < 2 === true"]) {
    const realm = new Realm((_line) => {});
    const result = execute("let result = " + source + ";", realm);
    const actual = value(realm, "result");
    check(result.type === "normal" && actual.kind === "boolean" && actual.value, source);
}
const objectExpressions: string[] = [];
for (const op of ["<", ">", "<=", ">="]) {
    objectExpressions.push("operand " + op + " 2", "2 " + op + " operand", "operand " + op + " 'x'", "'x' " + op + " operand");
}
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
class ObservedArray extends GuestArray {
    reads = 0;
    override internalGet(_key: PropertyKey, _receiver: Value, _loc: Location): ValueCompletion {
        this.reads++;
        return sentinel;
    }
}
for (const expression of objectExpressions) {
    const realm = new Realm((_line) => {});
    const object = new ObservedObject();
    seed(realm, "operand", { kind: "object", object });
    const result = execute(expression + ";", realm);
    check(result.type === "throw" && result.diagnostic.name === "TypeError" && object.reads === 0, expression + " does not read hooks");
    const array = new ObservedArray();
    seed(realm, "operand", { kind: "object", object: array });
    const arrayResult = execute(expression + ";", realm);
    check(arrayResult.type === "throw" && arrayResult.diagnostic.name === "TypeError" && array.reads === 0, expression + " array does not read hooks");
    object.callable = { kind: "builtin", invoke: (_receiver, _args, _context, _loc): Completion => sentinel };
    seed(realm, "operand", { kind: "object", object });
    const functionResult = execute(expression + ";", realm);
    check(functionResult.type === "throw" && functionResult.diagnostic.name === "TypeError" && object.reads === 0, expression + " function does not read hooks");
}
for (const op of ["<", ">", "<=", ">="]) {
    const realm = new Realm((line) => console.log(line));
    let order = "";
    seed(realm, "left", builtin((_receiver, _args, _context, _loc) => {
        order += "L";
        return normal({ kind: "string", value: "6" });
    }));
    seed(realm, "right", builtin((_receiver, _args, _context, _loc) => {
        order += "R";
        return normal({ kind: "string", value: "2" });
    }));
    seed(realm, "stop", builtin((_receiver, _args, _context, _loc): Completion => sentinel));
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
// Hook-bearing ordinary objects, arrays and functions must reject without calls.
for (const objectSource of ["{}", "[]", "function() {} "]) {
    for (const expression of objectExpressions) {
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
        const result = execute("\n" + expression + ";", realm);
        // Preserve the parser-provided expression location (binary start, not token).
        const column = 1;
        check(result.type === "throw" && result.diagnostic.phase === "runtime" && result.diagnostic.name === "TypeError"
            && result.diagnostic.message === "object-to-primitive conversion unsupported"
            && result.diagnostic.loc.line === 2 && result.diagnostic.loc.column === column, expression + " located object rejection");
        const hooks = value(realm, "hooks");
        check(hooks.kind === "number" && hooks.value === 0, "no conversion hooks");
    }
}

const realm = new Realm((_line) => {});
check(execute(readFileSync("test/fixtures/relational.js", "utf8"), realm).type === "normal", "runtime-read closure fixture");
const trace = value(realm, "trace");
check(trace.kind === "string" && trace.value === "LRLRLRLR", "closure effects once in order");
for (const name of ["lt", "gt", "le", "ge"]) {
    const result = value(realm, name);
    check(result.kind === "boolean" && result.value, "closure comparison " + name);
}
console.log("relational passed");
