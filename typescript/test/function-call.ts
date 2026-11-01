import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, failure, normal, type Completion, type Value, type ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function object(value: Value): GuestObject { if (value.kind !== "object") throw new Error("expected object"); return value.object; }
function value(object: GuestObject): Value { return { kind: "object", object }; }
function number(n: number): Value { return { kind: "number", value: n }; }
function text(s: string): Value { return { kind: "string", value: s }; }
function result(c: Completion): Value { check(c.type === "normal", "normal completion"); return c.value; }
function yes(c: Completion): void { const v = result(c); check(v.kind === "boolean" && v.value, "true result"); }
function program(source: string, e: Evaluator): Completion {
    const p = parse(source); check(p.error === null, "fixture parses");
    return e.block(p.body, e.context.realm.global, UNDEFINED);
}
function binding(r: Realm, name: string): Value { const b = r.global.bindings.get(name); if (b === undefined) throw new Error("missing binding: " + name); return b.value; }
function error(c: Completion, name: string, message: string, line: number, column: number): void {
    check(c.type === "throw" && c.diagnostic.phase === "runtime" && c.diagnostic.name === name && c.diagnostic.message === message && c.diagnostic.loc.line === line && c.diagnostic.loc.column === column, "exact diagnostic " + name + " " + line + ":" + column);
}
const loc: Location = { line: 77, column: 9 };
const r = new Realm((_line) => { throw new Error("unexpected output"); });
const e = new Evaluator(r);
const call = r.functionPrototype.get("call");
const callObject = object(call);
const other = new Realm((_line) => {});
check(callObject !== object(other.functionPrototype.get("call")) && callObject.getPrototypeOf() === r.functionPrototype, "per-Realm method and prototype");
check(callObject.ownPropertyKeys().join(",") === "name,length", "method own metadata only");
for (const key of ["name", "length"]) {
    const d = callObject.getOwnProperty(key);
    check(d !== undefined && !d.writable && !d.enumerable && d.configurable, "metadata flags");
}
check(callObject.get("name").kind === "string" && (callObject.get("name") as {kind: "string"; value: string}).value === "call", "name call");
const length = callObject.get("length"); check(length.kind === "number" && length.value === 1, "length one");
const method = r.functionPrototype.getOwnProperty("call");
check(method !== undefined && method.writable && !method.enumerable && method.configurable, "method flags");
check(!r.global.bindings.has("Function") && r.functionPrototype.get("constructor").kind === "undefined", "no constructor");
check(r.createObject().get("call").kind === "undefined" && r.createArray().get("call").kind === "undefined", "O/A do not inherit call");
const low = new GuestObject(); low.callable = { kind: "builtin", invoke: (_receiver, _args, _context, _loc) => normal() };
check(low.get("call").kind === "undefined", "null-root callable stays bare");
check(low.setPrototypeOf(r.functionPrototype).type === "normal" && low.get("call") === call, "deliberate linking");
check(program(readFileSync("test/fixtures/function-call.js", "utf8"), e).type === "normal", "runtime-read fixture");
for (const name of ["ordered", "chained", "noArgs", "bypass"]) { const v = binding(r, name); check(v.kind === "boolean" && v.value, name); }
check(binding(r, "noReceiver") === UNDEFINED, "missing thisArg");
check((binding(r, "trace") as {kind: "string"; value: string}).value === "bptaze", "base/key/this/rest/extra order");
check((binding(r, "count") as {kind: "number"; value: number}).value === 3, "target effects once per call");
const token = binding(r, "token");
const first = binding(r, "first");
const second = binding(r, "second");
const receiver = binding(r, "receiver");
const builtinReceiver = value(r.createBuiltin("receiver", 0, (thisArg, _args, _context, _loc) => normal(thisArg)));
const kinds: Value[] = [UNDEFINED, {kind: "null"}, {kind: "boolean", value: false}, {kind: "boolean", value: true}, number(-0), number(NaN), number(Infinity), text(""), text("abc"), token, receiver];
for (const thisArg of kinds) {
    check(result(e.call(call, receiver, [thisArg, first, second], loc)) === thisArg, "unchanged guest this Value");
    check(result(e.call(call, builtinReceiver, [thisArg, first, second], loc)) === thisArg, "unchanged builtin this Value");
    check(result(e.call(call, binding(r, "identity"), [thisArg, first, second], loc)) === first, "exact argument/return Value");
    check(result(e.call(call, value(r.functionPrototype), [thisArg, first], loc)) === UNDEFINED, "callable F");
}
let visits = 0;
const original: Value[] = [token, first, second];
const inspect = value(r.createBuiltin("inspect", 2, (thisArg, args, context, actualLoc) => {
    visits++;
    check(thisArg === token && args.length === 2 && args[0] === first && args[1] === second && args !== original, "ordered copied args, unchanged Values");
    check(context === e.context && actualLoc === loc && e.calls === 2, "active context/location/two frames");
    args.push(UNDEFINED);
    return normal(second);
}));
const before = e.steps;
check(result(e.call(call, inspect, original, loc)) === second && visits === 1 && e.steps === before && e.calls === 0, "builtin forwarding adds zero ticks");
check(original.length === 3 && original[0] === token && original[1] === first && original[2] === second, "input list preserved");
const empty = value(r.createBuiltin("empty", 0, (thisArg, args, _context, _loc) => { check(thisArg === UNDEFINED && args.length === 0, "no args builtin"); return normal(); }));
check(result(e.call(call, empty, [], loc)) === UNDEFINED, "missing this/rest builtin");
// No Get on the target, even for names usually used in call dispatch/metadata.
class NoLookup extends GuestObject {
    override internalGet(_key: string, _receiver: Value, _loc: Location): ValueCompletion { throw new Error("target property lookup"); }
}
const opaque = new NoLookup(); opaque.callable = {kind: "builtin", invoke: (thisArg, _args, _context, _loc) => normal(thisArg)};
check(result(e.call(call, value(opaque), [token], loc)) === token, "no target property lookup/coercion");
const invalid: Value[] = [UNDEFINED, {kind: "null"}, {kind: "boolean", value: false}, number(1), text("call"), value(r.createObject()), value(r.createArray())];
for (const bad of invalid) {
    error(e.call(call, bad, [token, first], loc), "TypeError", "Function.prototype.call receiver is not callable", 77, 9);
    const start = binding(r, "trace");
    const c = e.call(binding(r, "borrowed"), UNDEFINED, [bad], loc);
    error(c, "TypeError", "Function.prototype.call receiver is not callable", 22, 31);
    const end = binding(r, "trace");
    check(start.kind === "string" && end.kind === "string" && end.value === start.value + "ta", "bad receiver arguments run first");
    check(e.calls === 0, "invalid receiver cleanup");
}
const detached = e.call(binding(r, "detached"), UNDEFINED, [], loc);
error(detached, "TypeError", "Function.prototype.call receiver is not callable", 21, 30);
const trace = binding(r, "trace"); check(trace.kind === "string" && trace.value === "bptaze" + "ta".repeat(7) + "dx", "detached arguments run first");
for (const name of ["baseFailure", "propertyFailure", "argumentFailure"]) {
    const c = e.call(binding(r, name), UNDEFINED, [], loc);
    check(c.type === "throw" && c.diagnostic.name === "ReferenceError", "earlier expression failure");
}
const afterTrace = binding(r, "trace"); check(afterTrace.kind === "string" && trace.kind === "string" && afterTrace.value === trace.value + "t", "earlier failures skip later args and invocation");
check((binding(r, "count") as {kind: "number"; value: number}).value === 3, "failed expressions never invoke target");
const sentinel = failure("Sentinel", "original", loc); sentinel.value = token;
const thrower = value(r.createBuiltin("thrower", 0, (_receiver, _args, _context, _loc) => sentinel));
check(e.call(call, thrower, [], loc) === sentinel && e.calls === 0, "exact sentinel throw completion");
const guestThrow = e.call(call, binding(r, "throwValue"), [UNDEFINED, token], loc);
check(guestThrow.type === "throw" && guestThrow.value === token, "guest throw identity");
error(guestThrow, "Uncaught", "guest throw", 5, 26);
const fault = new Error("host fault");
const broken = value(r.createBuiltin("broken", 0, (_receiver, _args, _context, _loc): Completion => { throw fault; }));
let caught = false;
try { e.call(call, broken, [], loc); } catch (x) { caught = x instanceof Error && x === fault; }
check(caught && e.calls === 0, "host fault identity and cleanup");
for (const type of ["return", "break", "continue"] as const) {
    const illegal = value(r.createBuiltin("illegal", 0, (_receiver, _args, _context, _loc) => ({type, value: token})));
    let escaped = false;
    try { e.call(call, illegal, [], loc); } catch (x) { escaped = x instanceof Error && x.message === "invalid completion escaped call boundary: " + type; }
    check(escaped && e.calls === 0, "illegal completion cleanup");
}
check(result(e.call(call, receiver, [token], loc)) === token, "post-fault capacity restored");
// Nested guest/builtin reentry uses one context and restores the outer depth.
let reentries = 0;
const reenter = value(r.createBuiltin("reenter", 1, (thisArg, args, context, callLoc) => {
    reentries++;
    check(context === e.context && e.calls === 4 && thisArg === token && args[0] === first, "reentry context/depth");
    const c = context.call(call, binding(r, "identity"), [token, args[0]], callLoc);
    check(e.calls === 4, "nested depth restored"); return c;
}));
check(result(e.call(call, binding(r, "guestBridge"), [token, reenter, first], loc)) === first && reentries === 1 && e.calls === 0, "guest/builtin/guest reentry");
// Forwarding itself consumes no steps, even with a zero step budget.
const zeroSteps = new Evaluator(r, 0, 2);
check(result(zeroSteps.call(call, empty, [], loc)) === UNDEFINED && zeroSteps.steps === 0, "no synthetic tick");
const oneCall = new Evaluator(r, 100, 1);
error(oneCall.call(call, empty, [], loc), "RangeError", "call depth limit exceeded", 77, 9);
error(oneCall.call(call, UNDEFINED, [], loc), "TypeError", "Function.prototype.call receiver is not callable", 77, 9);
check(oneCall.calls === 0 && oneCall.steps === 0, "depth rejection cleanup and validation order");
const noCalls = new Evaluator(r, 100, 0);
error(noCalls.call(call, empty, [], loc), "RangeError", "call depth limit exceeded", 77, 9);
check(noCalls.calls === 0 && noCalls.steps === 0, "outer call guard before entry");
const recursive = new Evaluator(r, 100, 4);
const recursion = recursive.call(binding(r, "recurse"), UNDEFINED, [], loc);
error(recursion, "RangeError", "call depth limit exceeded", 6, 29);
check(recursive.calls === 0 && recursive.steps === 10, "recursive .call exact depth/ticks");
const budget = new Evaluator(r, 1, 8);
const tickTarget = value(r.createBuiltin("ticks", 0, (_receiver, _args, context, callLoc) => {
    for (let i = 0; i < 2; i++) { const tick = context.tick(callLoc); if (tick.type === "throw") return tick; }
    return normal();
}));
error(budget.call(call, tickTarget, [], loc), "RangeError", "execution step limit exceeded", 77, 9);
check(budget.steps === 2 && budget.calls === 0, "shared monotonic tick budget");
error(budget.call(call, tickTarget, [], loc), "RangeError", "execution step limit exceeded", 77, 9);
check(budget.steps === 3 && budget.calls === 0, "no fresh budget on reentry");
// Foreign origin keeps lexical identity, but existing execution uses caller Realm.
const foreignEval = new Evaluator(other);
const foreignResult = object(result(foreignEval.call(call, binding(r, "foreign"), [token], loc)));
check(foreignResult.getPrototypeOf() === other.objectPrototype && foreignResult.get("captured") === token && foreignResult.get("receiver") === token, "foreign lexical identity/caller allocation");
check(object(foreignResult.get("array")).getPrototypeOf() === other.arrayPrototype && object(foreignResult.get("fn")).getPrototypeOf() === other.functionPrototype, "foreign nested allocations use caller");
check(object(binding(r, "foreign")).getPrototypeOf() === r.functionPrototype && object(token).getPrototypeOf() === r.objectPrototype, "transferred Values not reparented");
const foreignBuiltin = value(r.createBuiltin("foreign", 0, (thisArg, _args, context, actualLoc) => {
    check(context === foreignEval.context && actualLoc === loc && thisArg === token, "foreign builtin gets caller context"); return normal(thisArg);
}));
check(result(foreignEval.call(call, foreignBuiltin, [token], loc)) === token, "foreign intrinsic and target");
// Mutate only R1, while saved intrinsic identity remains usable.
const otherCall = other.functionPrototype.get("call");
check(r.functionPrototype.set("call", number(7), e.context, loc).type === "normal", "replace method");
check(other.functionPrototype.get("call") === otherCall && object(receiver).get("call").kind === "number", "replacement isolation/inheritance");
check(result(e.call(call, receiver, [token], loc)) === token, "saved intrinsic after replacement");
check(r.functionPrototype.internalDelete("call").type === "normal" && object(receiver).get("call").kind === "undefined" && other.functionPrototype.get("call") === otherCall, "deletion isolation");
check(callObject.defineOwnProperty("name", {value: text("changed")}, e.context, loc).type === "normal" && object(otherCall).get("name").kind === "string", "metadata mutation independent");
const changedName = callObject.get("name"); check(changedName.kind === "string" && changedName.value === "changed", "metadata mutation took effect");
const otherName = object(otherCall).get("name"); check(otherName.kind === "string" && otherName.value === "call", "other metadata unchanged");
console.log("function call passed");
