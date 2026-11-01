import { readFileSync } from "node:fs";
import { GuestArray } from "../src/array-object.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { run } from "../src/interpreter.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, failure, type Completion, type Value } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) throw new Error(message);
}
function binding(realm: Realm, name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined || !entry.initialized) throw new Error("missing binding: " + name);
    return entry.value;
}
function array(value: Value): GuestArray {
    if (value.kind !== "object" || !(value.object instanceof GuestArray)) throw new Error("expected guest array");
    return value.object;
}
function number(value: Value, expected: number): boolean {
    return value.kind === "number" && value.value === expected;
}
function shape(object: GuestArray, length: number, keys: string, realm: Realm): void {
    const desc = object.getOwnProperty("length");
    check(desc !== undefined && number(desc.value, length) && desc.writable && !desc.enumerable && !desc.configurable, "length and flags");
    check(object.ownPropertyKeys().join(",") === keys, "own keys and holes");
    check(object.getPrototypeOf() === realm.arrayPrototype, "Realm array prototype");
    for (const key of object.ownPropertyKeys()) {
        if (key === "length") continue;
        const element = object.getOwnProperty(key);
        check(element !== undefined && element.writable && element.enumerable && element.configurable, "element W/E/C");
    }
}
function program(source: string, evaluator: Evaluator): Completion {
    const parsed = parse(source);
    if (parsed.error !== null) throw new Error(parsed.error.message);
    return evaluator.block(parsed.body, evaluator.context.realm.global, UNDEFINED);
}
const source = readFileSync("test/fixtures/array-literals.js", "utf8");
const realm = new Realm((_line) => {});
const result = run(source, realm);
check(result.phase === "runtime" && result.completion.type === "normal", "runtime-read fixture");
shape(array(binding(realm, "empty")), 0, "length", realm);
shape(array(binding(realm, "oneHole")), 1, "length", realm);
shape(array(binding(realm, "twoHoles")), 2, "length", realm);
shape(array(binding(realm, "trailing")), 1, "0,length", realm);
shape(array(binding(realm, "trailingHole")), 2, "0,length", realm);
const mixed = array(binding(realm, "mixed"));
shape(mixed, 4, "1,2,length", realm);
check(mixed.getOwnProperty("0") === undefined && mixed.getOwnProperty("3") === undefined, "holes absent");
check(mixed.getOwnProperty("1")?.value.kind === "undefined", "explicit undefined present");
check(mixed.getOwnProperty("2")?.value.kind === "null", "guest null is present");
const first = array(binding(realm, "first"));
const second = array(binding(realm, "second"));
check(first !== second, "repeated evaluation freshness");
check(first.getOwnProperty("0")?.value === binding(realm, "shared"), "shared Value identity");
check(second.getOwnProperty("0")?.value === binding(realm, "shared"), "shared nested identity");
shape(array(binding(realm, "grown")), 5, "0,4,length", realm);
shape(array(binding(realm, "shrunk")), 1, "0,length", realm);
shape(array(binding(realm, "nested")), 3, "0,1,2,length", realm);
const other = new Realm((_line) => {});
const otherResult = run(source, other);
check(otherResult.phase === "runtime" && otherResult.completion.type === "normal", "second realm");
check(array(binding(other, "first")) !== first && binding(other, "shared") !== binding(realm, "shared"), "realm independence");

// Actual parsed element calls must stop at the exact original abrupt record.
const abruptRealm = new Realm((_line) => {});
const host = new GuestObject();
abruptRealm.global.bindings.set("host", { initialized: true, mutable: true, value: { kind: "object", object: host } });
const sentinel = failure("Sentinel", "exact", { line: 9, column: 7 });
sentinel.value = { kind: "object", object: new GuestObject() };
abruptRealm.registerBuiltin(host, "stop", 0, (_receiver, _args, _context, _loc) => sentinel);
const abruptEval = new Evaluator(abruptRealm);
const abrupt = program(`
let effects = 0;
let pending = [effects = effects + 1, host.stop(), effects = effects + 10];
`, abruptEval);
check(abrupt === sentinel, "exact throw record and identity");
check(number(binding(abruptRealm, "effects"), 1), "left effects retained, later effects skipped");
check(abruptRealm.global.bindings.get("pending")?.initialized === false, "partial array never escapes initializer");

// Two AST ticks plus one per hole: exact success and failure boundaries.
for (const limit of [4, 5]) {
    const budgetRealm = new Realm((_line) => {});
    const evaluator = new Evaluator(budgetRealm, limit);
    const completion = program("let holes = [,,,];", evaluator);
    check(evaluator.steps === 5, "three holes cost five total ticks");
    if (limit === 5) {
        check(completion.type === "normal", "exact budget succeeds");
        shape(array(binding(budgetRealm, "holes")), 3, "length", budgetRealm);
    } else {
        check(completion.type === "throw" && completion.diagnostic.name === "RangeError" && completion.diagnostic.loc.column === 13, "hole budget location");
        check(budgetRealm.global.bindings.get("holes")?.initialized === false, "budget prevents assignment");
    }
}
const nestedEval = new Evaluator(new Realm((_line) => {}), 6);
const nestedBudget = program("let holes = [[,,],,];", nestedEval);
check(nestedBudget.type === "throw" && nestedBudget.diagnostic.name === "RangeError" && nestedBudget.diagnostic.loc.column === 13 && nestedEval.steps === 7, "nested slots share budget");
const presentEval = new Evaluator(new Realm((_line) => {}), 3);
check(program("let a = [1];", presentEval).type === "throw" && presentEval.steps === 4, "present slot charged before expression");
const largeEval = new Evaluator(new Realm((_line) => {}), 20);
check(program("let a = [" + ",".repeat(50000) + "];", largeEval).type === "throw" && largeEval.steps === 21, "large sparse literal bounded");
console.log("array literals passed");
