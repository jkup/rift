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
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, { kind: "builtin", realm, invoke });
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
realm.registerBuiltin(host, "observe", 1, (receiver, args, context, callLoc) => {
    check(context.realm === realm && callLoc.line === 1, "active realm/location");
    check(number(args[0], contexts.length + 1), "retained lexical counter");
    contexts.push(context);
    return normal(args[0]);
});
realm.registerBuiltin(host, "callback", 3, (_receiver, args, context, callLoc) => context.call(args[0], args[1], [args[2]], callLoc));
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
const inspect = builtin(realm, (actualThis, actualArgs, context, actualLoc) => {
    check(actualThis === receiver && actualArgs === args && actualArgs[0] === arg && actualLoc === loc, "builtin argument identities");
    check(context === evalA.context && evalA.calls === 1, "same context/depth");
    return context.call(binding("identity"), actualThis, actualArgs, actualLoc);
});
const returned = evalA.call(inspect, receiver, args, loc);
check(returned.type === "normal" && returned.value === arg && evalA.calls === 0, "guest argument identity and cleanup");
const empty = evalA.call(binding("empty"), receiver, [], loc);
check(empty.type === "normal" && empty.value === UNDEFINED, "guest fallthrough");
const realmCheck = builtin(other, (_receiver, _args, context, _loc) => { check(context.realm === other, "other realm context"); return normal(); });
const evalB = new Evaluator(other);
check(evalB.context !== evalA.context && evalB.call(realmCheck, UNDEFINED, [], loc).type === "normal", "realm independence");
check(evalA.call(realmCheck, UNDEFINED, [], loc).type === "normal" && evalA.context.realm === realm, "foreign explicit owner");
check(!other.global.bindings.has("saved"), "lexical state isolation");

// A guest bridge propagates the original host-supplied throw record unchanged.
const sentinel = failure("Sentinel", "original", loc);
sentinel.value = arg;
realm.registerBuiltin(host, "thrower", 0, (_receiver, _args, _context, _loc) => sentinel);
check(program("function throwing() { return host.thrower(); } function guestThrow(x) { throw x; }", evalA).type === "normal", "throw setup");
const thrown = evalA.call(binding("throwing"), UNDEFINED, [], { line: 99, column: 1 });
check(thrown === sentinel && thrown.value === arg && thrown.diagnostic === sentinel.diagnostic && evalA.calls === 0, "exact abrupt record");
const guestThrown = evalA.call(binding("guestThrow"), receiver, args, loc);
check(guestThrown.type === "throw" && guestThrown.value === arg && guestThrown.diagnostic.phase === "runtime" && guestThrown.diagnostic.loc.line === 1, "actual guest throw");

// Nested builtin loops spend the same monotonic budget, even without AST work.
const budget = new Evaluator(realm, 3, 8);
let visits = 0;
const loop = builtin(other, (_receiver, _args, context, callLoc) => {
    check(context === budget.context && context.realm === other, "R13 foreign nested tick context");
    for (let i = 0; i < 3; i++) {
        const tick = context.tick(callLoc);
        if (tick.type === "throw") return tick;
        visits++;
    }
    return normal();
});
const outer = builtin(realm, (_receiver, _args, context, callLoc) => {
    const tick = context.tick(callLoc);
    if (tick.type === "throw") return tick;
    return context.call(loop, UNDEFINED, [], callLoc);
});
exactError(budget.call(outer, UNDEFINED, [], loc), "RangeError", "execution step limit exceeded");
check(visits === 2 && budget.steps === 4 && budget.calls === 0 && budget.context.realm === realm, "shared ticks exact total");
exactError(budget.context.tick(loc), "RangeError", "execution step limit exceeded");
check(budget.steps === 5 && evalB.steps === 0, "monotonic independent steps");

// Guest -> builtin -> guest recursion cannot replenish call or AST budgets.
const recursive = new Evaluator(realm, 1000, 4);
let reentries = 0;
realm.registerBuiltin(host, "reenter", 0, (_receiver, args, context, callLoc) => {
    check(context === recursive.context, "recursive context");
    reentries++;
    return context.call(args[0], UNDEFINED, [], callLoc);
});
check(program("function recurse() { return host.reenter(recurse); }", recursive).type === "normal", "recursion setup");
const recursion = recursive.call(binding("recurse"), UNDEFINED, [], loc);
check(recursion.type === "throw" && recursion.diagnostic.name === "RangeError" && recursion.diagnostic.phase === "runtime" && recursion.diagnostic.loc.line === 1 && recursion.diagnostic.loc.column === 29, "recursive call guard");
check(reentries === 2 && recursive.calls === 0 && recursive.steps === 11, "deterministic guest ticks/call depth");
const limited = new Evaluator(realm, 2, 8);


const bridge = builtin(realm, (_receiver, _args, context, callLoc) => {
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
const broken = builtin(realm, (_receiver, _args, _context, _loc): Completion => { throw fault; });
const recovery = builtin(realm, (_receiver, _args, context, callLoc) => {
    let caught = false;
    try { context.call(broken, UNDEFINED, [], callLoc); }
    catch (error) { caught = error instanceof Error && error === fault; }
    check(caught && faults.calls === 1, "nested host fault preserves prior depth");
    return context.call(binding("identity"), receiver, args, callLoc);
});
check(faults.call(recovery, UNDEFINED, [], loc).type === "normal" && faults.calls === 0, "recovered call capacity");
for (const type of ["return", "break", "continue"] as const) {
    const invalid = builtin(realm, (_receiver, _args, _context, _loc) => ({ type, value: UNDEFINED }));
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


// TS-017A R1-R16: defining ownership and synchronous evaluator reentry.
function objectValue(object: GuestObject): Value { return { kind: "object", object }; }
function objectOf(value: Value): GuestObject {
    if (value.kind !== "object") throw new Error("expected object");
    return value.object;
}
function returnedValue(completion: Completion): Value {
    if (completion.type !== "normal") throw new Error("expected normal result");
    return completion.value;
}
function realmBinding(owner: Realm, name: string): Value {
    const entry = owner.global.bindings.get(name);
    if (entry === undefined) throw new Error("missing " + name);
    return entry.value;
}
function idle(evaluator: Evaluator, owner: Realm): void {
    check(evaluator.context.realm === owner && evaluator.calls === 0 && evaluator.depth === 0, "restored idle evaluator");
}
function exactError(result: Completion, name: string, message: string): void {
    check(result.type === "throw" && result.diagnostic.name === name && result.diagnostic.message === message && result.diagnostic.loc === loc, message);
}
const a = new Realm((_line) => { throw new Error("bootstrap must be silent"); });
const b = new Realm((_line) => { throw new Error("bootstrap must be silent"); });
const c = new Realm((_line) => { throw new Error("bootstrap must be silent"); });
const entry = new Evaluator(a);
const defining = new Evaluator(b);
const third = new Evaluator(c);
const entryContext = entry.context;
const token = objectValue(a.createObject());
a.global.bindings.set("n", { initialized: true, mutable: true, value: { kind: "number", value: 100 } });
b.global.bindings.set("token", { initialized: true, mutable: true, value: token });
check(program(`
    let n = 0;
    function retained() {
        n = n + 1;
        return {
            o: {},
            a: [],
            f: function() {
                return {};
            },
            token: token
        };
    }
    let expression = function() {
        return token;
    };
    function throwingToken(x) {
        throw x;
    }
`, defining).type === "normal", "R1 guest setup");
const retainedFunction = realmBinding(b, "retained");
for (const owner of [a, b, c]) {
    check(owner.functionPrototype.callable !== null && owner.functionPrototype.callable.realm === owner, "R1 F owner");
    const intrinsic = objectOf(owner.functionPrototype.get("call"));
    check(intrinsic.callable !== null && intrinsic.callable.realm === owner, "R1 call owner");
    check(returnedValue(entry.call(objectValue(owner.functionPrototype), token, [], loc)) === UNDEFINED, "R1 F result");
    idle(entry, a);
    check(entry.steps === 0, "R1 borrowed roots add no ticks");
}
for (const fn of [retainedFunction, realmBinding(b, "expression")]) {
    const callable = objectOf(fn).callable;
    check(callable !== null && callable.realm === b, "R1 guest owner");
}
for (let i = 0; i < 2; i++) {
    const allocated = objectOf(returnedValue(entry.call(retainedFunction, UNDEFINED, [], loc)));
    check(allocated.getPrototypeOf() === b.objectPrototype && objectOf(allocated.get("o")).getPrototypeOf() === b.objectPrototype, "R2 defining objects");
    check(objectOf(allocated.get("a")).getPrototypeOf() === b.arrayPrototype, "R2 defining array");
    const nested = objectOf(allocated.get("f"));
    check(nested.getPrototypeOf() === b.functionPrototype && nested.callable !== null && nested.callable.realm === b, "R2 nested owner");
    const later = returnedValue(third.call(allocated.get("f"), UNDEFINED, [], loc));
    check(objectOf(later).getPrototypeOf() === b.objectPrototype, "R2 later allocation");
    check(allocated.get("token") === token, "R3 lexical token identity");
    idle(entry, a);
    idle(third, c);
}
check(number(realmBinding(b, "n"), 2) && number(realmBinding(a, "n"), 100), "R3 lexical mutable state");

const observedRealms: Realm[] = [];
const savedContexts: OperationContext[] = [];
const snapshots: Realm[] = [];
function observeEntry(context: OperationContext, owner: Realm, calls: number): void {
    check(context === entryContext && context.realm === owner && entry.calls === calls, "R4 stable active context and calls");
    check(context.realm.createObject().getPrototypeOf() === owner.objectPrototype, "R4 active allocation");
    observedRealms.push(context.realm);
}
const callbackA = builtin(a, (_receiver, _args, context, _loc) => {
    observeEntry(context, a, 3);
    check(savedContexts[0].realm === a && snapshots[0] === b, "R5 live context and fixed snapshot inside callback");
    return normal(token);
});
const middleB = builtin(b, (_receiver, _args, context, at) => {
    observeEntry(context, b, 2);
    savedContexts.push(context);
    snapshots.push(context.realm);
    const result = context.call(callbackA, UNDEFINED, [], at);
    observeEntry(context, b, 2);
    check(savedContexts[0].realm === b && snapshots[0] === b, "R5 restored saved view");
    return result;
});
const outerA = builtin(a, (_receiver, _args, context, at) => {
    observeEntry(context, a, 1);
    const result = context.call(middleB, UNDEFINED, [], at);
    observeEntry(context, a, 1);
    return result;
});
check(returnedValue(entry.call(outerA, UNDEFINED, [], loc)) === token, "R4 exact result");
check(observedRealms.length === 5 && observedRealms[0] === a && observedRealms[1] === b && observedRealms[2] === a && observedRealms[3] === b && observedRealms[4] === a, "R4 entry trace A B A B A");
check(savedContexts[0] === entryContext && savedContexts[0].realm === a && snapshots[0] === b, "R5 idle saved view");
idle(entry, a);

// The observer delegates exactly once, inspecting the real borrowed intrinsic.
class EntryObserver extends Evaluator {
    target: Value = UNDEFINED;
    before: Realm[] = [];
    after: Realm[] = [];
    override call(callee: Value, receiver: Value, args: Value[], at: Location) {
        if (callee === this.target) this.before.push(this.context.realm);
        const result = super.call(callee, receiver, args, at);
        if (callee === this.target) this.after.push(this.context.realm);
        return result;
    }
}
const borrowed = c.functionPrototype.get("call");
const observer = new EntryObserver(a);
const argument = objectValue(c.createObject());
let targetEffects = 0;
const targetB = builtin(b, (receiver, args, context, at) => {
    targetEffects++;
    check(context.realm === b && context === observer.context && observer.calls === 2, "R6 target entry");
    check(receiver === token && args.length === 1 && args[0] === argument && at === loc, "R6 forwarded identities");
    return normal(argument);
});
observer.target = targetB;
check(returnedValue(observer.call(borrowed, targetB, [token, argument], loc)) === argument, "R6 result");
check(observer.before[0] === c && observer.after[0] === c && observer.steps === 0, "R6 intermediate C and zero ticks");
idle(observer, a);
exactError(observer.call(borrowed, UNDEFINED, [], loc), "TypeError", "Function.prototype.call receiver is not callable");
observer.maxCalls = 1;
exactError(observer.call(borrowed, targetB, [token, argument], loc), "RangeError", "call depth limit exceeded");
check(targetEffects === 1 && observer.steps === 0, "R7 target guard no effects/ticks");
idle(observer, a);

const exactThrow = failure("Sentinel", "foreign", loc);
exactThrow.value = token;
const throwingB = builtin(b, (_receiver, _args, context, _at) => {
    check(context.realm === b, "R8 throw owner");
    return exactThrow;
});
const throwBridge = builtin(a, (_receiver, _args, context, at) => context.call(borrowed, throwingB, [], at));
const propagated = entry.call(throwBridge, UNDEFINED, [], loc);
check(propagated === exactThrow && propagated.value === token && propagated.diagnostic === exactThrow.diagnostic && propagated.diagnostic.loc === loc, "R8 exact throw through C and A");
const parsedThrow = entry.call(realmBinding(b, "throwingToken"), UNDEFINED, [token], loc);
const throwingCallable = objectOf(realmBinding(b, "throwingToken")).callable;
if (throwingCallable === null || throwingCallable.kind !== "guest") throw new Error("guest throw fixture");
check(parsedThrow.type === "throw" && parsedThrow.value === token && parsedThrow.diagnostic.loc === throwingCallable.body[0].loc, "R8 actual AST throw location");
idle(entry, a);

const foreignFault = new Error("foreign host fault");
const faultB = builtin(b, (_receiver, _args, context, _at): Completion => {
    check(context.realm === b, "R9 fault owner");
    throw foreignFault;
});
b.global.bindings.set("fault", { initialized: true, mutable: true, value: faultB });
check(program(`
    function astFault() {
        {
            return fault();
        }
    }
`, defining).type === "normal", "R9 AST setup");
const recoverA = builtin(a, (_receiver, _args, context, at) => {
    const priorCalls = entry.calls;
    const priorDepth = entry.depth;
    check(priorDepth > 0, "R9 caller AST frames remain active");
    let caught = false;
    try {
        context.call(borrowed, realmBinding(b, "astFault"), [], at);
    } catch (error) {
        caught = error instanceof Error && error === foreignFault;
    }
    check(caught && context.realm === a && entry.calls === priorCalls && entry.depth === priorDepth, "R9 restore prior frames and exact fault");
    return context.call(realmBinding(b, "expression"), UNDEFINED, [], at);
});
a.global.bindings.set("recover", { initialized: true, mutable: true, value: recoverA });
check(program(`
    function recoveryAST() {
        return recover();
    }
`, entry).type === "normal", "R9 caller setup");
check(returnedValue(entry.call(realmBinding(a, "recoveryAST"), UNDEFINED, [], loc)) === token, "R9 recovery callback");
idle(entry, a);
for (const type of ["return", "break", "continue"] as const) {
    const invalid = builtin(b, (_receiver, _args, _context, _at) => ({ type, value: token }));
    let caught = false;
    try {
        entry.call(invalid, UNDEFINED, [], loc);
    } catch (error) {
        caught = error instanceof Error && error.message === "invalid completion escaped call boundary: " + type;
    }
    check(caught, "R10 illegal foreign builtin completion");
    idle(entry, a);
}
for (const type of ["break", "continue"] as const) {
    const invalid = defining.closure([], [{ kind: type, loc }], new Environment(null));
    let caught = false;
    try {
        entry.call(invalid, UNDEFINED, [], loc);
    } catch (error) {
        caught = error instanceof Error && error.message === "invalid completion escaped call boundary: " + type;
    }
    check(caught, "R10 illegal foreign guest completion");
    idle(entry, a);
}
const foreignEmpty = defining.closure([], [], new Environment(null));
check(returnedValue(entry.call(foreignEmpty, UNDEFINED, [], loc)) === UNDEFINED, "R10 foreign fallthrough");
idle(entry, a);
const guard = new Evaluator(a, 10, 0);
exactError(guard.call(UNDEFINED, UNDEFINED, [], loc), "TypeError", "value is not callable");
exactError(guard.call(objectValue(b.functionPrototype), UNDEFINED, [], loc), "RangeError", "call depth limit exceeded");
check(guard.steps === 0, "R11 guards do not tick");
idle(guard, a);
guard.maxCalls = 1;
const guardedB = builtin(b, (_receiver, _args, context, at) => {
    exactError(context.call(UNDEFINED, UNDEFINED, [], at), "TypeError", "value is not callable");
    exactError(context.call(objectValue(a.functionPrototype), UNDEFINED, [], at), "RangeError", "call depth limit exceeded");
    check(context.realm === b && guard.calls === 1, "R11 failed entry preserves B");
    return normal();
});
guard.call(guardedB, UNDEFINED, [], loc);
idle(guard, a);
const alternating = new Evaluator(a, 10, 3);
const alternation: Realm[] = [];
let alternateA: Value = UNDEFINED;
let alternateB: Value = UNDEFINED;
alternateA = builtin(a, (_receiver, _args, context, at) => {
    alternation.push(context.realm);
    return context.call(alternateB, UNDEFINED, [], at);
});
alternateB = builtin(b, (_receiver, _args, context, at) => {
    alternation.push(context.realm);
    return context.call(alternateA, UNDEFINED, [], at);
});
exactError(alternating.call(alternateA, UNDEFINED, [], loc), "RangeError", "call depth limit exceeded");
check(alternation.length === 3 && alternation[0] === a && alternation[1] === b && alternation[2] === a && alternating.steps === 0, "R12 shared call slots");
idle(alternating, a);

// R14: one retained function shares lexical state, never evaluator budgets.
const separate = new Evaluator(c);
const tickContexts: OperationContext[] = [];
let sharedCount = 0;
const tickB = builtin(b, (_receiver, _args, context, at) => {
    check(context.realm === b, "R14 tick owner");
    tickContexts.push(context);
    sharedCount++;
    return context.tick(at);
});
const firstBudget = new Evaluator(a);
firstBudget.call(tickB, UNDEFINED, [], loc);
separate.call(tickB, UNDEFINED, [], loc);
firstBudget.call(tickB, UNDEFINED, [], loc);
check(firstBudget.steps === 2 && separate.steps === 1 && sharedCount === 3 && tickContexts[0] !== tickContexts[1] && tickContexts[0] === tickContexts[2], "R14 independent evaluator budgets");
idle(firstBudget, a);
idle(separate, c);
const deep = new Evaluator(a);
deep.depth = 256;
exactError(deep.evaluate({ kind: "literal", value: 1, loc }, a.global, UNDEFINED), "RangeError", "evaluation nesting limit exceeded");
exactError(deep.statement({ kind: "empty", loc }, a.global, UNDEFINED), "RangeError", "evaluation nesting limit exceeded");
check(deep.depth === 256 && deep.steps === 2 && deep.calls === 0 && deep.context.realm === a, "R15 guard releases only attempted depth");
for (const proto of [c.functionPrototype, null]) {
    check(objectOf(retainedFunction).setPrototypeOf(proto).value, "R16 prototype change");
    objectOf(retainedFunction).bootstrapDefine("name", { value: { kind: "string", value: "changed" }, configurable: true });
    objectOf(retainedFunction).bootstrapDefine("length", { value: { kind: "number", value: 99 }, configurable: true });
    const allocated = objectOf(returnedValue(entry.call(retainedFunction, UNDEFINED, [], loc)));
    check(allocated.getPrototypeOf() === b.objectPrototype && allocated.get("token") === token, "R16 owner independent from metadata/prototype");
    idle(entry, a);
}
check(objectOf(middleB).getPrototypeOf() === null && objectOf(middleB).ownPropertyKeys().length === 0, "R16 explicit null-root fixture remains bare");
check(entry.context === entryContext, "stable context through all paths");
console.log("operation context passed");
