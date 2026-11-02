import { Evaluator } from "../src/evaluator.js";
import { GuestObject, UNDEFINED, putValue } from "../src/runtime.js";
import type { OperationContext, Completion, DataDescriptorUpdate, InternalBooleanCompletion, PropertyKey, ThrowCompletion, Value } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { run } from "../src/interpreter.js";

const keyEvaluator = new Evaluator(new Realm((_line) => {}));
const keyContext = keyEvaluator.context;
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function boolean(r: InternalBooleanCompletion, expected: boolean): void {
    check(r.type === "normal" && r.value === expected, "boolean completion");
}
const loc = { line: 17, column: 9 };
const rhs = obj(new GuestObject());
class DefinitionObject extends GuestObject {
    mode = "success";
    calls = 0;
    seenLocation: Location = { line: 0, column: 0 };
    seenContext: OperationContext | null = null;
    seenKey: PropertyKey = "";
    seenDescriptor: DataDescriptorUpdate = {};
    thrown: ThrowCompletion = { type: "throw", value: obj(new GuestObject()), diagnostic: { phase: "runtime", name: "RangeError", message: "definition sentinel", loc } };
    defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, context: OperationContext, location: Location): InternalBooleanCompletion {
        this.calls++;
        this.seenContext = context;
        this.seenLocation = location;
        this.seenKey = key;
        this.seenDescriptor = desc;
        if (this.mode === "false") return { type: "normal", value: false };
        if (this.mode === "throw") {
            this.thrown.diagnostic.loc = location;
            return this.thrown;
        }
        return super.defineOwnProperty(key, desc, context, location);
    }
}
function exact(r: Completion | InternalBooleanCompletion, target: DefinitionObject): void {
    check(r === target.thrown, "exact throw record");
    if (r.type !== "throw") throw new Error("expected throw");
    check(r.value === target.thrown.value && r.diagnostic === target.thrown.diagnostic, "throw payload identities");
    check(r.diagnostic.loc === target.seenLocation, "throw location identity");
}
// Both receiver paths and every completion outcome use actual virtual dispatch.
for (const own of [false, true]) {
    for (const mode of ["success", "false", "throw"]) {
        const base = new GuestObject();
        base.bootstrapDefine("x", { value: UNDEFINED, writable: true, enumerable: false, configurable: false });
        const receiver = new DefinitionObject();
        if (own) receiver.bootstrapDefine("x", { value: UNDEFINED, writable: true, enumerable: false, configurable: false });
        receiver.calls = 0;
        receiver.mode = mode;
        const r = base.internalSet("x", rhs, obj(receiver), keyContext, loc);
        check(receiver.calls === 1 && receiver.seenContext === keyContext && receiver.seenLocation === loc && receiver.seenKey === "x", "receiver dispatch once with source");
        check(receiver.seenDescriptor.value === rhs, "unconverted RHS");
        check(receiver.seenDescriptor.writable === (own ? undefined : true), "update versus creation descriptor");
        check(receiver.seenDescriptor.enumerable === (own ? undefined : true) && receiver.seenDescriptor.configurable === (own ? undefined : true), "descriptor flags");
        if (mode === "throw") exact(r, receiver);
        else boolean(r, mode === "success");
        const d = receiver.getOwnProperty("x");
        if (mode === "success") check(d !== undefined && d.value === rhs && d.writable && d.enumerable === !own && d.configurable === !own, "successful receiver state");
        else check(own ? d !== undefined && d.value === UNDEFINED : d === undefined, "failure preserves receiver");
        check(base.get("x") === UNDEFINED, "lookup base unchanged");
    }
}
for (const own of [false, true]) {
    for (const mode of ["success", "false", "throw"]) {
        for (const viaReference of [false, true]) {
            const target = new DefinitionObject();
            if (own) target.bootstrapDefine("x", { value: UNDEFINED, writable: true, enumerable: true, configurable: true });
            target.calls = 0; target.mode = mode;
            const r = viaReference ? putValue({ kind: "property", base: { kind: "object", object: target }, key: { kind: "string", value: "x" }, loc }, rhs, keyContext, loc) : target.set("x", rhs, keyContext, loc);
            check(target.calls === 1 && target.seenContext === keyContext && target.seenLocation === loc, "strict dispatch once");
            if (mode === "throw") exact(r, target);
            else if (mode === "false") check(r.type === "throw" && r.diagnostic.name === "TypeError" && r.diagnostic.phase === "runtime" && r.diagnostic.loc === loc, "strict false translation");
            else check(r.type === "normal" && r.value === rhs, "strict RHS identity");
        }
    }
}
const base = new GuestObject();
base.bootstrapDefine("locked", { value: UNDEFINED, writable: false, enumerable: true, configurable: true });
const receiver = new DefinitionObject();
receiver.bootstrapDefine("locked", { value: rhs, writable: true, enumerable: true, configurable: true });
receiver.bootstrapDefine("ownLocked", { value: rhs, writable: false, enumerable: true, configurable: true });
receiver.calls = 0; receiver.mode = "throw";
boolean(base.internalSet("locked", UNDEFINED, obj(receiver), keyContext, loc), false);
boolean(base.internalSet("ownLocked", UNDEFINED, obj(receiver), keyContext, loc), false);
check(receiver.calls === 0 && receiver.get("locked") === rhs && receiver.get("ownLocked") === rhs, "readonly rejection before override");
const inherited = new DefinitionObject();
boolean(inherited.setPrototypeOf(base), true);
inherited.mode = "throw";
boolean(inherited.internalSet("locked", rhs, obj(inherited), keyContext, loc), false);
for (const primitive of [UNDEFINED, { kind: "null" } as const, { kind: "number", value: 1 } as const, { kind: "boolean", value: true } as const, { kind: "string", value: "s" } as const]) {
    boolean(inherited.internalSet("new", rhs, primitive, keyContext, loc), false);
}
check(inherited.calls === 0, "inherited readonly and primitive rejection before definition");
const closed = new DefinitionObject();
closed.bootstrapDefine("existing", { value: UNDEFINED, writable: true, enumerable: true, configurable: true });
boolean(closed.preventExtensions(), true);
closed.calls = 0;
boolean(base.internalSet("missing", rhs, obj(closed), keyContext, loc), false);
check(closed.calls === 1 && closed.getOwnProperty("missing") === undefined, "extensibility checked inside ordinary definition");
boolean(base.internalSet("existing", rhs, obj(closed), keyContext, loc), true);
check(closed.calls === 2 && closed.get("existing") === rhs, "nonextensible own update dispatch");
closed.mode = "throw";
exact(base.internalSet("missing", rhs, obj(closed), keyContext, loc), closed);
check(closed.calls === 3, "nonextensibility does not bypass override");

// Seed the evaluator without adding guest reflection or syntax.
for (const mode of ["success", "false", "throw"]) {
    let output = "";
    const realm = new Realm((line) => { output += line + "\n"; });
    const target = new DefinitionObject(); target.mode = mode;
    realm.global.bindings.set("target", { initialized: true, mutable: true, value: obj(target) });
    realm.global.bindings.set("rhs", { initialized: true, mutable: true, value: rhs });
    const r = run("function effect() { console.log('rhs'); return rhs; }\n  let assigned = target.x = effect();", realm);
    check(r.phase === "runtime", "guest runtime phase");
    if (r.phase !== "runtime") throw new Error("unexpected parse failure");
    check(output === "rhs\n" && target.calls === 1, "RHS effect before definition exactly once");
    check(target.seenContext !== null && target.seenContext.realm === realm, "guest active realm context");
    check(target.seenLocation.line === 2 && target.seenLocation.column === 18, "guest source location");
    if (mode === "throw") exact(r.completion, target);
    else if (mode === "false") check(r.completion.type === "throw" && r.completion.diagnostic.name === "TypeError" && r.completion.diagnostic.loc === target.seenLocation, "guest false translation location");
    else check(r.completion.type === "normal" && realm.global.bindings.get("assigned")?.value === rhs && target.get("x") === rhs, "guest assignment RHS identity");
    const before = target.calls;
    const abrupt = run("target.x = missing;", realm);
    check(abrupt.phase === "runtime" && abrupt.completion.type === "throw" && abrupt.completion.diagnostic.name === "ReferenceError", "abrupt RHS");
    check(target.calls === before, "abrupt RHS skips definition");
    const stopped = run("target.y = effect(); console.log('after');", realm);
    check(stopped.phase === "runtime" && output === (mode === "success" ? "rhs\nrhs\nafter\n" : "rhs\nrhs\n"), "failure stops following statement");
}
// Bootstrap failure observers use the dedicated setup dispatch, never semantics.
class BootstrapObserver extends GuestObject {
    mode = "false";
    calls = 0;
    seenLocation: Location = { line: 0, column: 0 };
    protected bootstrapDefineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, location: Location): InternalBooleanCompletion {
        this.calls++;
        this.seenLocation = location;
        if (this.mode === "false") return { type: "normal", value: false };
        if (this.mode === "throw") return { type: "throw", value: rhs, diagnostic: { phase: "runtime", name: "TypeError", message: "bootstrap sentinel", loc: location } };
        return super.bootstrapDefineOwnProperty(key, desc, location);
    }
}
for (const mode of ["false", "throw"]) {
    const target = new BootstrapObserver(); target.mode = mode;
    let hostFault = false;
    try { target.bootstrapDefine("x", { value: rhs, writable: true, enumerable: true, configurable: true }); }
    catch (error) { hostFault = error instanceof Error; }
    check(hostFault && target.calls === 1 && target.getOwnProperty("x") === undefined, "bootstrap host initialization fault");
    check(target.seenLocation.line === 1 && target.seenLocation.column === 1, "bootstrap synthetic location");
}
// P1/P3: setup bypasses semantics, inherited Set retains context, and ordinary
// data definitions spend no execution budget even for an object-valued RHS.
const setupOnly = new DefinitionObject();
setupOnly.mode = "throw";
setupOnly.bootstrapDefine("length", { value: rhs, writable: true });
check(setupOnly.calls === 0 && setupOnly.get("length") === rhs, "bootstrap excludes semantic override");
const active = new Evaluator(new Realm((_line) => {}), 0);
const child = new DefinitionObject();
const parent = new GuestObject();
parent.bootstrapDefine("x", { value: UNDEFINED, writable: true });
boolean(child.setPrototypeOf(parent), true);
const inheritedWrite = child.set("x", rhs, active.context, loc);
check(inheritedWrite.type === "normal" && inheritedWrite.value === rhs, "inherited write original RHS");
check(child.calls === 1 && child.seenContext === active.context && child.seenLocation === loc, "inherited context and location");
boolean(child.defineOwnProperty("length", { value: rhs }, active.context, loc), true);
check(child.calls === 2 && child.seenContext === active.context && child.get("length") === rhs, "direct Define identity");
check(active.steps === 0 && active.calls === 0 && keyEvaluator.steps === 0, "ordinary writes add no ticks or calls");
// W18: bootstrap dispatch validates virtual indices without a context.
const silentRealm = new Realm((_line) => { throw new Error("W18 bootstrap output"); });
const bootstrapText: GuestObject = silentRealm.createStringObject("ab");
bootstrapText.bootstrapDefine("0", { value: { kind: "string", value: "a" }, writable: false, enumerable: true, configurable: false });
let invalidIndexEscaped = false;
try {
    bootstrapText.bootstrapDefine("0", { writable: true });
} catch (error) {
    invalidIndexEscaped = error instanceof Error && error.message === "invalid internal property definition: 0";
}
check(invalidIndexEscaped, "W18 invalid bootstrap index invariant");
bootstrapText.preventExtensions();
bootstrapText.bootstrapDefine("0", {});
const bootstrapUnit = bootstrapText.getOwnProperty("0");
check(bootstrapUnit !== undefined && !bootstrapUnit.writable && bootstrapUnit.enumerable && !bootstrapUnit.configurable, "W18 bootstrap flags unchanged");
check(keyEvaluator.steps === 0 && keyEvaluator.calls === 0, "W18 no execution work");
console.log("definition dispatch passed");
