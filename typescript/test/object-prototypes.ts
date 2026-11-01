import { Evaluator } from "../src/evaluator.js";
import { readFileSync } from "node:fs";
import { GuestObject, UNDEFINED, sameValue, putValue } from "../src/runtime.js";
import type { Value, InternalBooleanCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { run } from "../src/interpreter.js";
const loc = { line: 1, column: 1 };
const keyEvaluator = new Evaluator(new Realm((_line) => {}));
const keyContext = keyEvaluator.context;
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function num(value: number): Value { return { kind: "number", value }; }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function result(r: InternalBooleanCompletion, expected: boolean, message: string): void {
    check(r.type === "normal" && r.value === expected, message);
}
function read(o: GuestObject, key: string, expected: Value): void {
    const r = o.internalGet(key, UNDEFINED, loc);
    check(r.type === "normal" && sameValue(r.value, expected), "read " + key);
}
const root = new GuestObject();
const child = new GuestObject();
const leaf = new GuestObject();
check(root.getPrototypeOf() === null, "initial null");
root.bootstrapDefine("x", { value: num(1), writable: true, enumerable: false, configurable: false });
root.bootstrapDefine("fixed", { value: num(2), writable: false, enumerable: true, configurable: false });
result(child.setPrototypeOf(root), true, "link child");
result(leaf.setPrototypeOf(child), true, "link leaf");
read(leaf, "x", num(1)); read(leaf, "absent", UNDEFINED);
child.bootstrapDefine("x", { value: UNDEFINED, writable: true, enumerable: true, configurable: true });
read(leaf, "x", UNDEFINED);
result(root.setPrototypeOf(root), false, "self cycle");
result(root.setPrototypeOf(leaf), false, "indirect cycle");
check(root.getPrototypeOf() === null && child.getPrototypeOf() === root, "cycle atomicity");
result(leaf.setPrototypeOf(null), true, "unlink");
result(leaf.setPrototypeOf(child), true, "relink");
leaf.preventExtensions();
result(leaf.setPrototypeOf(child), true, "same frozen prototype");
result(leaf.setPrototypeOf(root), false, "changed frozen prototype");
result(leaf.setPrototypeOf(null), false, "frozen unlink");
check(leaf.getPrototypeOf() === child, "frozen prototype unchanged");
const receiver = new GuestObject();
result(root.internalSet("x", num(3), obj(receiver), keyContext, loc), true, "distinct receiver creation");
read(root, "x", num(1)); read(receiver, "x", num(3));
const created = receiver.getOwnProperty("x");
check(created !== undefined && created.writable && created.enumerable && created.configurable, "creation flags");
receiver.bootstrapDefine("own", { value: num(4), writable: true, enumerable: false, configurable: false });
receiver.preventExtensions();
result(root.internalSet("own", num(5), obj(receiver), keyContext, loc), true, "missing base updates receiver own");
const updated = receiver.getOwnProperty("own");
check(updated !== undefined && updated.writable && !updated.enumerable && !updated.configurable, "preserve flags");
read(receiver, "own", num(5));
result(root.internalSet("new", num(6), obj(receiver), keyContext, loc), false, "nonextensible receiver missing");
result(root.internalSet("x", num(7), obj(receiver), keyContext, loc), true, "nonextensible existing");
result(receiver.defineOwnProperty("x", { writable: false }, keyContext, loc), true, "freeze receiver");
result(root.internalSet("x", num(7), obj(receiver), keyContext, loc), false, "receiver readonly same value");
read(receiver, "x", num(7)); read(root, "x", num(1));
const other = new GuestObject();
other.bootstrapDefine("fixed", { value: num(8), writable: true, enumerable: true, configurable: true });
result(root.internalSet("fixed", num(9), obj(other), keyContext, loc), false, "base readonly beats receiver writable");
read(other, "fixed", num(8));
for (const primitive of [UNDEFINED, { kind: "null" } as const, num(1), { kind: "boolean", value: true } as const, { kind: "string", value: "x" } as const]) {
    result(root.internalSet("x", num(9), primitive, keyContext, loc), false, "primitive existing");
    result(root.internalSet("absent", num(9), primitive, keyContext, loc), false, "primitive absent");
}
result(child.internalSet("fixed", num(2), obj(child), keyContext, loc), false, "inherited readonly");
check(child.getOwnProperty("fixed") === undefined, "no rejected shadow");
check(putValue({ kind: "property", base: { kind: "object", object: child }, key: { kind: "string", value: "fixed" }, loc }, num(2), keyContext, loc).type === "throw", "strict boundary");
const rhs = num(11);
const assigned = putValue({ kind: "property", base: { kind: "object", object: child }, key: { kind: "string", value: "x" }, loc }, rhs, keyContext, loc);
check(assigned.type === "normal" && assigned.value === rhs, "assignment RHS identity");
// Build bottom-up: each insertion checks a short chain; final traversal is deep.
const deep = new GuestObject();
let tail = deep;
for (let i = 0; i < 20000; i++) {
    const next = new GuestObject();
    result(tail.setPrototypeOf(next), true, "deep link");
    tail = next;
}
tail.bootstrapDefine("end", { value: num(42), writable: true, enumerable: true, configurable: true });
read(deep, "end", num(42)); read(deep, "missing", UNDEFINED);
result(deep.internalSet("end", num(43), obj(deep), keyContext, loc), true, "deep set");
read(deep, "end", num(43)); read(tail, "end", num(42));
result(tail.setPrototypeOf(deep), false, "deep cycle");
const source = readFileSync(process.argv[2], "utf8");
function seed(realm: Realm): GuestObject {
    const parent = new GuestObject();
    parent.bootstrapDefine("x", { value: num(10), writable: true, enumerable: true, configurable: true });
    parent.bootstrapDefine("fixed", { value: num(20), writable: false, enumerable: true, configurable: false });
    const target = new GuestObject();
    target.setPrototypeOf(parent);
    realm.global.bindings.set("parent", { initialized: true, mutable: true, value: obj(parent) });
    realm.global.bindings.set("child", { initialized: true, mutable: true, value: obj(target) });
    return target;
}
let output = "";
const a = new Realm((line) => { output += line + "\n"; });
const b = new Realm((_line) => { throw new Error("unexpected realm output"); });
const ac = seed(a); const bc = seed(b);
const executed = run(source, a);
check(executed.phase === "runtime" && executed.completion.type === "normal", "guest prototype fixture");
check(output === "10 undefined\n31 10\n31\n32 10\n", "guest expected output");
read(bc, "x", num(10));
check(bc.getOwnProperty("x") === undefined && bc.getPrototypeOf() !== ac.getPrototypeOf(), "realm prototype isolation");
const rejected = run("child.fixed = console.log('rhs'); console.log('after');", a);
check(rejected.phase === "runtime" && rejected.completion.type === "throw" && rejected.completion.diagnostic.name === "TypeError", "guest inherited strict failure");
check(output === "10 undefined\n31 10\n31\n32 10\nrhs\n", "RHS before failure");
check(ac.getOwnProperty("fixed") === undefined, "guest rejection atomicity");
const detached = run("let detached = child.method; detached();", a);
check(detached.phase === "runtime" && detached.completion.type === "throw" && detached.completion.diagnostic.name === "TypeError", "detached inherited method");
const abrupt = run("child.x = missing;", a);
check(abrupt.phase === "runtime" && abrupt.completion.type === "throw" && abrupt.completion.diagnostic.name === "ReferenceError", "abrupt RHS");
read(ac, "x", num(32));
console.log("object prototypes passed");
