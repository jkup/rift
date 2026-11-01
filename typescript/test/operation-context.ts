import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { run } from "../src/interpreter.js";
import { Realm } from "../src/realm.js";
import { Environment, GuestObject, UNDEFINED, failure, normal, type Builtin, type Completion, type OperationContext, type Value } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const loc: Location = { line: 7, column: 9 };
const realm = new Realm((_line) => {});
const other = new Realm((_line) => {});
const host = new GuestObject();
realm.global.bindings.set("host", { initialized: true, mutable: true, value: { kind: "object", object: host } });
function builtin(invoke: Builtin): Value {
    const object = new GuestObject();
    object.callable = { kind: "builtin", invoke };
    return { kind: "object", object };
}
function program(source: string, evaluator: Evaluator): Completion {
    const parsed = parse(source);
    check(parsed.error === null, "test source must parse");
    return evaluator.block(parsed.body, evaluator.context.realm.global, UNDEFINED);
}
function binding(name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined) throw new Error("missing test binding");
    return entry.value;
}
function number(value: Value, expected: number): boolean { return value.kind === "number" && value.value === expected; }
function range(result: Completion, location: Location): void {
    check(result.type === "throw" && result.diagnostic.phase === "runtime" && result.diagnostic.name === "RangeError" && result.diagnostic.loc === location, "budget diagnostic/location");
}

// The retained guest closure captures mutable lexical state, never an evaluator.
const contexts: OperationContext[] = [];
realm.registerBuiltin(host, "observe", (receiver, args, context, callLoc) => {
    check(context.realm === realm && callLoc.line === 1, "active realm/location");
    check(number(args[0], contexts.length + 1), "retained lexical counter");
    contexts.push(context);
    return normal(args[0]);
});
realm.registerBuiltin(host, "callback", (_receiver, args, context, callLoc) => context.call(args[0], args[1], [args[2]], callLoc));
check(run("function make() { let n=0; return function(x) { n=n+1; host.observe(n); return this; }; } let saved=make(); let receiver={}; let argument={}; let result=host.callback(saved,receiver,argument);", realm).phase === "runtime", "setup run");
const firstContext = contexts[0];
check(firstContext !== undefined && binding("result") === binding("receiver"), "guest this exact Value");
const next = run("result=host.callback(saved,receiver,argument);", realm);
check(next.phase === "runtime" && next.completion.type === "normal" && contexts.length === 2 && contexts[1] !== firstContext, "fresh top-level context");
const evalA = new Evaluator(realm);
check(program("function thisValue() { return this; }", evalA).type === "normal", "receiver setup");
for (const thisValue of [UNDEFINED, { kind: "null" } as const, { kind: "number", value: 23 } as const, binding("receiver")]) {
    const result = evalA.call(binding("thisValue"), thisValue, [], loc);
    check(result.type === "normal" && result.value === thisValue, "strict guest receiver identity");
}
check(program("function identity(x) { return x; } function empty() {}", evalA).type === "normal", "parsed callbacks");
const arg: Value = { kind: "object", object: new GuestObject() };
const receiver: Value = { kind: "number", value: 17 };
const args: Value[] = [arg];
const inspect = builtin((actualThis, actualArgs, context, actualLoc) => {
    check(actualThis === receiver && actualArgs === args && actualArgs[0] === arg && actualLoc === loc, "builtin argument identities");
    check(context === evalA.context && evalA.calls === 1, "same context/depth");
    return context.call(binding("identity"), actualThis, actualArgs, actualLoc);
});
const returned = evalA.call(inspect, receiver, args, loc);
check(returned.type === "normal" && returned.value === arg && evalA.calls === 0, "guest argument identity and cleanup");
const empty = evalA.call(binding("empty"), receiver, [], loc);
check(empty.type === "normal" && empty.value === UNDEFINED, "guest fallthrough");
const realmCheck = builtin((_receiver, _args, context, _loc) => { check(context.realm === other, "other realm context"); return normal(); });
const evalB = new Evaluator(other);
check(evalB.context !== evalA.context && evalB.call(realmCheck, UNDEFINED, [], loc).type === "normal", "realm independence");
check(!other.global.bindings.has("saved"), "lexical state isolation");

// A guest bridge propagates the original host-supplied throw record unchanged.
const sentinel = failure("Sentinel", "original", loc);
sentinel.value = arg;
realm.registerBuiltin(host, "thrower", (_receiver, _args, _context, _loc) => sentinel);
check(program("function throwing() { return host.thrower(); } function guestThrow(x) { throw x; }", evalA).type === "normal", "throw setup");
const thrown = evalA.call(binding("throwing"), UNDEFINED, [], { line: 99, column: 1 });
check(thrown === sentinel && thrown.value === arg && thrown.diagnostic === sentinel.diagnostic && evalA.calls === 0, "exact abrupt record");
const guestThrown = evalA.call(binding("guestThrow"), receiver, args, loc);
check(guestThrown.type === "throw" && guestThrown.value === arg && guestThrown.diagnostic.phase === "runtime" && guestThrown.diagnostic.loc.line === 1, "actual guest throw");

// Nested builtin loops spend the same monotonic budget, even without AST work.
const budget = new Evaluator(realm, 3, 8);
let visits = 0;
const loop = builtin((_receiver, _args, context, callLoc) => {
    check(context === budget.context, "nested tick context");
    for (let i = 0; i < 3; i++) {
        const tick = context.tick(callLoc);
        if (tick.type === "throw") return tick;
        visits++;
    }
    return normal();
});
const outer = builtin((_receiver, _args, context, callLoc) => {
    const tick = context.tick(callLoc);
    if (tick.type === "throw") return tick;
    return context.call(loop, UNDEFINED, [], callLoc);
});
range(budget.call(outer, UNDEFINED, [], loc), loc);
check(visits === 2 && budget.steps === 4 && budget.calls === 0, "shared ticks exact total");
range(budget.context.tick(loc), loc);
check(budget.steps === 5 && evalB.steps === 0, "monotonic independent steps");

// Guest -> builtin -> guest recursion cannot replenish call or AST budgets.
const recursive = new Evaluator(realm, 1000, 4);
let reentries = 0;
realm.registerBuiltin(host, "reenter", (_receiver, args, context, callLoc) => {
    check(context === recursive.context, "recursive context");
    reentries++;
    return context.call(args[0], UNDEFINED, [], callLoc);
});
check(program("function recurse() { return host.reenter(recurse); }", recursive).type === "normal", "recursion setup");
const recursion = recursive.call(binding("recurse"), UNDEFINED, [], loc);
check(recursion.type === "throw" && recursion.diagnostic.name === "RangeError" && recursion.diagnostic.phase === "runtime" && recursion.diagnostic.loc.line === 1 && recursion.diagnostic.loc.column === 29, "recursive call guard");
check(reentries === 2 && recursive.calls === 0 && recursive.steps === 11, "deterministic guest ticks/call depth");
const limited = new Evaluator(realm, 2, 8);


const bridge = builtin((_receiver, _args, context, callLoc) => {
    const tick = context.tick(callLoc);
    if (tick.type === "throw") return tick;
    return context.call(binding("identity"), receiver, args, callLoc);
});
const stepResult = limited.call(bridge, receiver, args, loc);
check(stepResult.type === "throw" && stepResult.diagnostic.name === "RangeError" && stepResult.diagnostic.phase === "runtime" && stepResult.diagnostic.loc.line === 1, "guest AST shares builtin ticks");
check(limited.steps === 3 && limited.calls === 0, "AST tick total");

// Faults are host exceptions; every nested call releases its active-call slot.
const faults = new Evaluator(realm, 1000, 3);
const fault = new Error("host sentinel");
const broken = builtin((_receiver, _args, _context, _loc): Completion => { throw fault; });
const recovery = builtin((_receiver, _args, context, callLoc) => {
    let caught = false;
    try { context.call(broken, UNDEFINED, [], callLoc); }
    catch (error) { caught = error instanceof Error && error === fault; }
    check(caught && faults.calls === 1, "nested host fault preserves prior depth");
    return context.call(binding("identity"), receiver, args, callLoc);
});
check(faults.call(recovery, UNDEFINED, [], loc).type === "normal" && faults.calls === 0, "recovered call capacity");
for (const type of ["return", "break", "continue"] as const) {
    const invalid = builtin((_receiver, _args, _context, _loc) => ({ type, value: UNDEFINED }));
    let escaped = false;
    try { faults.call(invalid, UNDEFINED, [], loc); }
    catch (error) { escaped = error instanceof Error && error.message === "invalid completion escaped call boundary: " + type; }
    check(escaped && faults.calls === 0, "invalid builtin completion cleanup");
}
for (const type of ["break", "continue"] as const) {
    // Parser excludes these; inject impossible guest bodies to test the boundary.
    const invalid = faults.closure([], [{ kind: type, loc }], new Environment(null));
    let escaped = false;
    try { faults.call(invalid, UNDEFINED, [], loc); }
    catch (error) { escaped = error instanceof Error && error.message === "invalid completion escaped call boundary: " + type; }
    check(escaped && faults.calls === 0, "escaped guest control cleanup");
}
const outputFault = new Realm((_line) => { throw fault; });
const outputEval = new Evaluator(outputFault);
let outputEscaped = false;
try { program("function output() { console.log(1); } output();", outputEval); }
catch (error) { outputEscaped = error instanceof Error && error === fault; }
check(outputEscaped && outputEval.calls === 0, "host output through guest cleanup");
const zero = new Evaluator(realm, 10, 0);
const noncallable = zero.call(UNDEFINED, UNDEFINED, [], loc);
check(noncallable.type === "throw" && noncallable.diagnostic.name === "TypeError", "callability before depth guard");
range(zero.call(binding("identity"), UNDEFINED, args, loc), loc);
check(zero.calls === 0 && zero.steps === 0, "guard before increment");
check(faults.call(binding("identity"), receiver, args, loc).type === "normal" && faults.calls === 0, "post-fault calls recover");
console.log("operation context passed");

