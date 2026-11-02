import { stringKeys } from "./key-assertions.js";
import type { PropertyKey } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, failure, normal, type Completion, type Value, type ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function object(value: Value): GuestObject {
    if (value.kind !== "object") throw new Error("expected object");
    return value.object;
}
function value(object: GuestObject): Value { return { kind: "object", object }; }
function number(n: number): Value { return { kind: "number", value: n }; }
function text(s: string): Value { return { kind: "string", value: s }; }
function result(c: Completion): Value {
    check(c.type === "normal", "normal completion");
    return c.value;
}
function program(source: string, e: Evaluator): Completion {
    const p = parse(source);
    check(p.error === null, "fixture parses");
    return e.block(p.body, e.context.realm.global, UNDEFINED);
}
function binding(r: Realm, name: string): Value {
    const b = r.global.bindings.get(name);
    if (b === undefined) throw new Error("missing binding: " + name);
    return b.value;
}
function error(c: Completion, name: string, message: string, line: number, column: number): void {
    check(
        c.type === "throw"
        && c.diagnostic.phase === "runtime"
        && c.diagnostic.name === name
        && c.diagnostic.message === message
        && c.diagnostic.loc.line === line
        && c.diagnostic.loc.column === column,
        "exact diagnostic " + name + " " + line + ":" + column,
    );
}
const loc: Location = { line: 77, column: 9 };
const r = new Realm((_line) => { throw new Error("unexpected output"); });
const e = new Evaluator(r);
const call = r.functionPrototype.get("call");
const callObject = object(call);
const other = new Realm((_line) => {});
check(callObject !== object(other.functionPrototype.get("call")) && callObject.getPrototypeOf() === r.functionPrototype, "per-Realm method and prototype");
check(stringKeys(callObject.ownPropertyKeys()).join(",") === "name,length", "method own metadata only");
for (const key of ["name", "length"]) {
    const d = callObject.getOwnProperty(key);
    check(d !== undefined && !d.writable && !d.enumerable && d.configurable, "metadata flags");
}
const name = callObject.get("name");
check(name.kind === "string" && name.value === "call", "name call");
const length = callObject.get("length");
check(length.kind === "number" && length.value === 1, "length one");
const method = r.functionPrototype.getOwnProperty("call");
check(method !== undefined && method.writable && !method.enumerable && method.configurable, "method flags");
check(!r.global.bindings.has("Function") && r.functionPrototype.get("constructor").kind === "undefined", "no constructor");
check(r.createObject().get("call").kind === "undefined" && r.createArray().get("call").kind === "undefined", "O/A do not inherit call");
const low = new GuestObject(null, false, { kind: "builtin", realm: r, invoke: (_receiver, _args, _context, _loc) => normal() });
check(low.get("call").kind === "undefined", "null-root callable stays bare");
const linked = low.setPrototypeOf(r.functionPrototype);
check(linked.type === "normal" && low.get("call") === call, "deliberate linking");
const fixture = readFileSync("test/fixtures/function-call.js", "utf8");
const setup = program(fixture, e);
check(setup.type === "normal", "runtime-read fixture");
for (const name of ["ordered", "chained", "noArgs", "bypass"]) {
    const v = binding(r, name);
    check(v.kind === "boolean" && v.value, name);
}
check(binding(r, "noReceiver") === UNDEFINED, "missing thisArg");
const initialTrace = binding(r, "trace");
check(initialTrace.kind === "string" && initialTrace.value === "bptaze", "base/key/this/rest/extra order");
const initialCount = binding(r, "count");
check(initialCount.kind === "number" && initialCount.value === 3, "target effects once per call");
const token = binding(r, "token");
const first = binding(r, "first");
const second = binding(r, "second");
const receiver = binding(r, "receiver");
const builtinReceiver = value(r.createBuiltin("receiver", 0, (thisArg, _args, _context, _loc) => normal(thisArg)));
const kinds: Value[] = [UNDEFINED, {kind: "null"}, {kind: "boolean", value: false}, {kind: "boolean", value: true}, number(-0), number(NaN), number(Infinity), text(""), text("abc"), token, receiver];
for (const thisArg of kinds) {
    const guestThis = e.call(call, receiver, [thisArg, first, second], loc);
    check(result(guestThis) === thisArg, "unchanged guest this Value");
    const builtinThis = e.call(call, builtinReceiver, [thisArg, first, second], loc);
    check(result(builtinThis) === thisArg, "unchanged builtin this Value");
    const argument = e.call(call, binding(r, "identity"), [thisArg, first, second], loc);
    check(result(argument) === first, "exact argument/return Value");
    const rootCall = e.call(call, value(r.functionPrototype), [thisArg, first], loc);
    check(result(rootCall) === UNDEFINED, "callable F");
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
const inspected = e.call(call, inspect, original, loc);
check(result(inspected) === second && visits === 1 && e.steps === before && e.calls === 0, "builtin forwarding adds zero ticks");
check(original.length === 3 && original[0] === token && original[1] === first && original[2] === second, "input list preserved");
const empty = value(r.createBuiltin("empty", 0, (thisArg, args, _context, _loc) => {
    check(thisArg === UNDEFINED && args.length === 0, "no args builtin");
    return normal();
}));
const emptyCall = e.call(call, empty, [], loc);
check(result(emptyCall) === UNDEFINED, "missing this/rest builtin");
// No Get on the target, even for names usually used in call dispatch/metadata.
class NoLookup extends GuestObject {
    override internalGet(_key: PropertyKey, _receiver: Value, _loc: Location): ValueCompletion { throw new Error("target property lookup"); }
}
const opaque = new NoLookup(null, false, {kind: "builtin", realm: r, invoke: (thisArg, _args, _context, _loc) => normal(thisArg)});
const opaqueCall = e.call(call, value(opaque), [token], loc);
check(result(opaqueCall) === token, "no target property lookup/coercion");
const invalid: Value[] = [UNDEFINED, {kind: "null"}, {kind: "boolean", value: false}, number(1), text("call"), value(r.createObject()), value(r.createArray())];
for (const bad of invalid) {
    const invalidCall = e.call(call, bad, [token, first], loc);
    error(invalidCall, "TypeError", "Function.prototype.call receiver is not callable", 77, 9);
    const start = binding(r, "trace");
    const c = e.call(binding(r, "borrowed"), UNDEFINED, [bad], loc);
    error(c, "TypeError", "Function.prototype.call receiver is not callable", 28, 31);
    const end = binding(r, "trace");
    check(start.kind === "string" && end.kind === "string" && end.value === start.value + "ta", "bad receiver arguments run first");
    check(e.calls === 0, "invalid receiver cleanup");
}
const detached = e.call(binding(r, "detached"), UNDEFINED, [], loc);
error(detached, "TypeError", "Function.prototype.call receiver is not callable", 27, 30);
const trace = binding(r, "trace");
check(trace.kind === "string" && trace.value === "bptaze" + "ta".repeat(7) + "dx", "detached arguments run first");
for (const name of ["baseFailure", "propertyFailure", "argumentFailure"]) {
    const c = e.call(binding(r, name), UNDEFINED, [], loc);
    check(c.type === "throw" && c.diagnostic.name === "ReferenceError", "earlier expression failure");
}
const afterTrace = binding(r, "trace");
check(afterTrace.kind === "string" && trace.kind === "string" && afterTrace.value === trace.value + "t", "earlier failures skip later args and invocation");
const afterCount = binding(r, "count");
check(afterCount.kind === "number" && afterCount.value === 3, "failed expressions never invoke target");
const sentinel = failure("Sentinel", "original", loc);
sentinel.value = token;
const thrower = value(r.createBuiltin("thrower", 0, (_receiver, _args, _context, _loc) => sentinel));
const sentinelThrow = e.call(call, thrower, [], loc);
check(sentinelThrow === sentinel && e.calls === 0, "exact sentinel throw completion");
const guestThrow = e.call(call, binding(r, "throwValue"), [UNDEFINED, token], loc);
check(guestThrow.type === "throw" && guestThrow.value === token, "guest throw identity");
error(guestThrow, "Uncaught", "guest throw", 5, 26);
const fault = new Error("host fault");
const broken = value(r.createBuiltin("broken", 0, (_receiver, _args, _context, _loc): Completion => { throw fault; }));
let caught = false;
try {
    e.call(call, broken, [], loc);
} catch (x) {
    caught = x instanceof Error && x === fault;
}
check(caught && e.calls === 0, "host fault identity and cleanup");
for (const type of ["return", "break", "continue"] as const) {
    const illegal = value(r.createBuiltin("illegal", 0, (_receiver, _args, _context, _loc) => ({type, value: token})));
    let escaped = false;
    try {
        e.call(call, illegal, [], loc);
    } catch (x) {
        escaped = x instanceof Error && x.message === "invalid completion escaped call boundary: " + type;
    }
    check(escaped && e.calls === 0, "illegal completion cleanup");
}
const recovered = e.call(call, receiver, [token], loc);
check(result(recovered) === token, "post-fault capacity restored");
// Nested guest/builtin reentry uses one context and restores the outer depth.
let reentries = 0;
const reenter = value(r.createBuiltin("reenter", 1, (thisArg, args, context, callLoc) => {
    reentries++;
    check(context === e.context && e.calls === 4 && thisArg === token && args[0] === first, "reentry context/depth");
    const c = context.call(call, binding(r, "identity"), [token, args[0]], callLoc);
    check(e.calls === 4, "nested depth restored");
    return c;
}));
const reentered = e.call(call, binding(r, "guestBridge"), [token, reenter, first], loc);
check(result(reentered) === first && reentries === 1 && e.calls === 0, "guest/builtin/guest reentry");
// Forwarding itself consumes no steps, even with a zero step budget.
const zeroSteps = new Evaluator(r, 0, 2);
const withoutSteps = zeroSteps.call(call, empty, [], loc);
check(result(withoutSteps) === UNDEFINED && zeroSteps.steps === 0, "no synthetic tick");
const oneCall = new Evaluator(r, 100, 1);
const forwardingLimit = oneCall.call(call, empty, [], loc);
error(forwardingLimit, "RangeError", "call depth limit exceeded", 77, 9);
const invalidAtLimit = oneCall.call(call, UNDEFINED, [], loc);
error(invalidAtLimit, "TypeError", "Function.prototype.call receiver is not callable", 77, 9);
check(oneCall.calls === 0 && oneCall.steps === 0, "depth rejection cleanup and validation order");
const noCalls = new Evaluator(r, 100, 0);
const entryLimit = noCalls.call(call, empty, [], loc);
error(entryLimit, "RangeError", "call depth limit exceeded", 77, 9);
check(noCalls.calls === 0 && noCalls.steps === 0, "outer call guard before entry");
const recursive = new Evaluator(r, 100, 4);
const recursion = recursive.call(binding(r, "recurse"), UNDEFINED, [], loc);
error(recursion, "RangeError", "call depth limit exceeded", 6, 29);
check(recursive.calls === 0 && recursive.steps === 10, "recursive .call exact depth/ticks");
const budget = new Evaluator(r, 1, 8);
const tickTarget = value(r.createBuiltin("ticks", 0, (_receiver, _args, context, callLoc) => {
    for (let i = 0; i < 2; i++) {
        const tick = context.tick(callLoc);
        if (tick.type === "throw") return tick;
    }
    return normal();
}));
const exhausted = budget.call(call, tickTarget, [], loc);
error(exhausted, "RangeError", "execution step limit exceeded", 77, 9);
check(budget.steps === 2 && budget.calls === 0, "shared monotonic tick budget");
const stillExhausted = budget.call(call, tickTarget, [], loc);
error(stillExhausted, "RangeError", "execution step limit exceeded", 77, 9);
check(budget.steps === 3 && budget.calls === 0, "no fresh budget on reentry");
// Foreign origin keeps lexical identity, and execution uses defining Realm.
const foreignEval = new Evaluator(other);
const foreignCall = foreignEval.call(call, binding(r, "foreign"), [token], loc);
const foreignResult = object(result(foreignCall));
check(foreignResult.getPrototypeOf() === r.objectPrototype && foreignResult.get("captured") === token && foreignResult.get("receiver") === token, "foreign lexical identity/defining allocation");
check(object(foreignResult.get("array")).getPrototypeOf() === r.arrayPrototype && object(foreignResult.get("fn")).getPrototypeOf() === r.functionPrototype, "foreign nested allocations use defining Realm");
check(object(binding(r, "foreign")).getPrototypeOf() === r.functionPrototype && object(token).getPrototypeOf() === r.objectPrototype, "transferred Values not reparented");
const foreignBuiltin = value(r.createBuiltin("foreign", 0, (thisArg, _args, context, actualLoc) => {
    check(context === foreignEval.context && context.realm === r && actualLoc === loc && thisArg === token, "foreign builtin gets stable context with defining Realm");
    return normal(thisArg);
}));
const foreignBuiltinCall = foreignEval.call(call, foreignBuiltin, [token], loc);
check(result(foreignBuiltinCall) === token, "foreign intrinsic and target");
check(foreignEval.context.realm === other, "R2 foreign call restores entry Realm");
// Mutate only R1, while saved intrinsic identity remains usable.
const otherCall = other.functionPrototype.get("call");
const replaced = r.functionPrototype.set("call", number(7), e.context, loc);
check(replaced.type === "normal", "replace method");
check(other.functionPrototype.get("call") === otherCall && object(receiver).get("call").kind === "number", "replacement isolation/inheritance");
const savedCall = e.call(call, receiver, [token], loc);
check(result(savedCall) === token, "saved intrinsic after replacement");
const deleted = r.functionPrototype.internalDelete("call");
check(deleted.type === "normal" && object(receiver).get("call").kind === "undefined" && other.functionPrototype.get("call") === otherCall, "deletion isolation");
const renamed = callObject.defineOwnProperty("name", {value: text("changed")}, e.context, loc);
const otherName = object(otherCall).get("name");
check(renamed.type === "normal" && otherName.kind === "string", "metadata mutation independent");
const changedName = callObject.get("name");
check(changedName.kind === "string" && changedName.value === "changed", "metadata mutation took effect");
check(otherName.kind === "string" && otherName.value === "call", "other metadata unchanged");
console.log("function call passed");
