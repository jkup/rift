import type { DataDescriptor as InspectionDataDescriptor, PropertyDescriptor as InspectionDescriptor } from "../src/runtime.js";
function dataDescriptor(d: InspectionDescriptor | undefined): InspectionDataDescriptor | undefined {
    if (d !== undefined && d.kind !== "data") throw new Error("expected data descriptor");
    return d;
}
import type { OperationContext } from "../src/runtime.js";
import { GuestArray } from "../src/array-object.js";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { lex } from "../src/lexer.js";
import { run } from "../src/interpreter.js";
import { observe, projectThrow, type ObservationResult } from "../src/observation.js";
import { GuestObject, UNDEFINED, normal, failure, resourceFailure, type Binding, type Builtin, type Completion, type ThrowCompletion, type Value, type ValueCompletion, type PropertyKey } from "../src/runtime.js";
import { toNumber, toString } from "../src/conversion.js";
import { toPrimitive } from "../src/primitive-conversion.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
import type { Expr, Location } from "../src/syntax.js";
import type { Guard } from "../src/outcomes.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line) => { throw new Error("unexpected output"); }); }
const loc: Location = { line: 7, column: 9 };
const unit = "test/observation.js";
function builtin(realm: Realm, invoke: Builtin): Value { return { kind: "object", object: realm.createBuiltin("test", 0, invoke) }; }
function thrown(result: Completion, label: string): ThrowCompletion {
    if (result.type !== "throw") throw new Error(label + " expected throw");
    return result;
}
function resource(result: Completion, guard: Guard, count: number, limit: number, label: string): void {
    const t = thrown(result, label);
    check(t.origin.kind === "resource-limit" && t.origin.guardCode === guard && t.origin.count === count && t.origin.limit === limit, label + " provenance");
    check(t.diagnostic.name === "RangeError" && t.diagnostic.phase === "runtime", label + " diagnostic");
    check(t.value.kind === "string" && t.value.value === "RangeError: " + t.diagnostic.message, label + " value");
    const projected = projectThrow(t);
    check(projected.kind === "resource-limit" && t.origin.kind === "resource-limit" && projected === t.origin, label + " projection identity");
}
function execute(source: string, evaluator: Evaluator): Completion {
    const parsed = parse(source);
    check(parsed.error === null && parsed.rejection === null, "runtime setup parses");
    return evaluator.block(parsed.body, evaluator.context.realm.global, UNDEFINED);
}
function observedResource(result: ObservationResult, guard: Guard, count: number, limit: number, label: string): void {
    const o = result.observation;
    check(o.kind === "resource-limit" && o.guardCode === guard && o.count === count && o.limit === limit, label);
}
// P01-P42: literal frozen inputs; columns are independent expected constants.
export const sources: string[] = [
    "", "let x; x = 2;", "1 = 2;", "while(false) let x;", "while(false) { let x; }", "return 1;", "function f(){return 1;}",
    "function f(x,x){}", '"use strict"; function f(x,x){}', "{function f(){} function f(){}}", "let x; let x;", "function f(x){let x;}",
    "let x=1\n x;", "let eval;", "let o={}; o.1;", "let o={1:2};", "const x=1;", "function f(){return\n1;}", "throw\n1;", "throw;", "break;", "continue;", "delete x;", "[...x];", "let o={__proto__:null};", "/*", "'a\nb';", "'a", "01;", "1e2;", "'\\x41';", "1**2;", "let π=1;", "return 1; 1**2;", "1=2; const x=1;", "'\\x", "\r\nreturn 1;", "\u2028\u2029return 1;", "'\u2028';", "\uFEFF1;", "\0" + "1;", "console.log('no'); const x=1;",
];
const codes: string[] = [
    "", "", "parse.assignment-target", "parse.declaration-statement", "", "parse.return-context", "", "parse.duplicate-parameter", "parse.duplicate-parameter", "parse.duplicate-binding", "parse.duplicate-binding", "parse.duplicate-binding", "parse.expected-token", "parse.binding-identifier", "parse.property-name", "parse.object-key", "parse.unexpected", "parse.line-terminator", "parse.line-terminator", "parse.throw-expression", "parse.loop-context", "parse.loop-context", "parse.delete-identifier", "parse.array-spread", "parse.prototype-literal", "lex.indeterminate-comment", "lex.indeterminate-string-newline", "lex.indeterminate-string-end", "lex.leading-zero", "lex.numeric-literal", "lex.string-escape", "lex.operator", "lex.character", "lex.operator", "parse.assignment-target", "lex.indeterminate-string-end", "parse.return-context", "parse.return-context", "", "lex.character", "lex.character", "parse.unexpected",
];
const lines = [0,0,1,1,0,1,0,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,0,1,1,1];
const columns = [0,0,1,14,0,1,0,1,15,17,8,15,2,5,13,8,1,14,1,1,1,1,1,2,8,1,1,1,1,1,1,2,5,12,1,1,1,1,0,1,1,20];
for (let i = 0; i < sources.length; i++) {
    const realm = fresh();
    const result = observe(sources[i], realm, i === 41 ? "body-observation" : "parser-observation", unit);
    const label = "P" + String(i + 1);
    check(!result.bodyEvaluated && result.unit === unit && result.stage === "test", label + " boundary");
    check(!realm.global.bindings.has("x") && !realm.global.bindings.has("f") && !realm.global.bindings.has("o"), label + " no binding effects");
    if (codes[i] === "") check(result.observation.kind === "normal" && result.location === null && result.diagnostic === null, label + " normal");
    else {
        if (i === 5 || i === 36 || i === 37) {
            check(result.observation.kind === "syntax-error" && result.observation.phase === "parse" && result.observation.constructorName === "SyntaxError" && result.observation.ruleCode === "return-outside-function", label + " certified return code");
        } else check(result.observation.kind === "unsupported-syntax" && result.observation.capabilityCode === codes[i], label + " code");
        check(result.location !== null && result.location.line === lines[i] && result.location.column === columns[i], label + " location");
        check(result.diagnostic !== null && result.diagnostic.phase === "parse" && result.diagnostic.name === "SyntaxError" && result.diagnostic.loc === result.location, label + " diagnostic");
    }
    const parsed = parse(sources[i]);
    check((parsed.error === null) === (parsed.rejection === null), label + " paired parse");
    const lexical = lex(sources[i]);
    check((lexical.error === null) === (lexical.rejection === null), label + " paired lex");
}
// R01-R07: exact UTF-16 and statement/expression nesting boundaries.
const sourceLimits = [" ".repeat(100000), " ".repeat(100001), "//" + "😀".repeat(49999), "//" + "😀".repeat(49999) + " "];
for (let i = 0; i < 4; i++) {
    const result = observe(sourceLimits[i], fresh(), "parser-observation", unit);
    if (i === 0 || i === 2) check(result.observation.kind === "normal", "R01/R03");
    else {
        observedResource(result, "source-units", 100001, 100000, "R02/R04");
        check(result.location?.line === 1 && result.location.column === 1 && !result.bodyEvaluated, "source guard location");
    }
}
for (const pairs of [127, 126]) {
    const result = observe("(".repeat(pairs) + "1" + ")".repeat(pairs) + ";", fresh(), "parser-observation", unit);
    if (pairs === 126) check(result.observation.kind === "normal", "R06");
    else { observedResource(result, "parse-depth", 129, 128, "R05"); check(result.location?.column === 128, "R05 loc"); }
}
const statements = observe("{".repeat(128) + ";" + "}".repeat(128), fresh(), "parser-observation", unit);
observedResource(statements, "parse-depth", 129, 128, "R07"); check(statements.location?.column === 129, "R07 loc");
// R08-R16: failure-site snapshots and precedence, with no budget reset.
{
    const e = new Evaluator(fresh(), 0); const r = e.tick(loc);
    resource(r, "steps", 1, 0, "R08"); check(thrown(r, "R08").diagnostic.loc === loc && e.steps === 1 && e.calls === 0 && e.depth === 0, "R08 state");
    const one = new Evaluator(fresh(), 1); check(one.tick(loc).type === "normal", "R09 first"); resource(one.tick(loc), "steps", 2, 1, "R09"); check(one.steps === 2, "R09 state");
}
for (const statement of [false, true]) {
    const realm = fresh(); const e = new Evaluator(realm); e.depth = 256; e.steps = 4; e.calls = 2;
    const r = statement ? e.statement({ kind: "empty", loc }, realm.global, UNDEFINED) : e.evaluate({ kind: "literal", value: 1, loc }, realm.global, UNDEFINED);
    resource(r, "evaluation-depth", 257, 256, statement ? "R11" : "R10"); check(e.depth === 256 && e.steps === 5 && e.calls === 2 && thrown(r, "depth").diagnostic.loc === loc, "depth restored");
}
{
    const realm = fresh(); const e = new Evaluator(realm, 0); e.depth = 256;
    resource(e.evaluate({ kind: "literal", value: 1, loc }, realm.global, UNDEFINED), "steps", 1, 0, "R12"); check(e.depth === 256, "R12 depth");
}
for (const calls of [0, 64, 63]) {
    const realm = fresh(); const foreign = fresh(); const e = calls === 0 ? new Evaluator(realm, 100000, 0) : new Evaluator(realm); e.calls = calls;
    let effects = 0;
    const fn = builtin(foreign, (_r, _a, context, _l) => { check(context.realm === foreign, "foreign active"); effects++; return normal(); });
    const r = e.call(fn, UNDEFINED, [], loc);
    if (calls === 63) check(r.type === "normal" && effects === 1, "R15");
    else { resource(r, "calls", calls, calls === 0 ? 0 : 64, calls === 0 ? "R13" : "R14"); check(effects === 0, "rejected builtin effects"); }
    check(e.calls === calls && e.context.realm === realm && e.depth === 0 && e.steps === 0, "call guard cleanup");
}
{
    const e = new Evaluator(fresh()); e.calls = 64;
    const r = thrown(e.call({ kind: "number", value: 1 }, UNDEFINED, [], loc), "R16");
    check(r.origin.kind === "engine-diagnostic" && r.diagnostic.name === "TypeError", "R16 precedence");
}
// R17-R20 execute real default guards, including native recursion.
{
    const realm = fresh(); const e = new Evaluator(realm);
    resource(execute("while(true){}", e), "steps", 100001, 100000, "R17"); check(e.calls === 0 && e.depth === 0 && e.steps === 100001, "R17 cleanup");
    const r = observe("while(true){}", fresh(), "body-observation", unit); observedResource(r, "steps", 100001, 100000, "R17 observation"); check(r.bodyEvaluated, "R17 body");
}
{
    const e = new Evaluator(fresh()); const r = execute("function f(){f();} f();", e);
    resource(r, "calls", 64, 64, "R18"); check(thrown(r, "R18").diagnostic.loc.column === 14 && e.calls === 0 && e.depth === 0, "R18 cleanup/location");
}
{
    const realm = fresh(); const foreign = fresh(); const e = new Evaluator(realm);
    let fn: Value = UNDEFINED;
    fn = builtin(foreign, (_r, _a, context, location) => context.call(fn, UNDEFINED, [], location));
    resource(e.call(fn, UNDEFINED, [], loc), "calls", 64, 64, "R19"); check(e.context.realm === realm && e.calls === 0 && e.depth === 0, "R19 cleanup");
}
{
    const realm = fresh(); const e = new Evaluator(realm);
    // Host AST setup deliberately bypasses the parser's smaller nesting guard.
    let expr: Expr = { kind: "literal", value: 1, loc };
    for (let i = 0; i < 256; i++) expr = { kind: "unary", op: "!", operand: expr, loc };
    resource(e.evaluate(expr, realm.global, UNDEFINED), "evaluation-depth", 257, 256, "R20"); check(e.depth === 0 && e.calls === 0 && e.steps === 257, "R20 cleanup");
}
// R21-R23: nonzero seed restoration on guest abrupt, host fault, and guard.
for (const action of ["guest", "host", "tick"]) {
    const realm = fresh(); const foreign = fresh(); const e = new Evaluator(realm, 5); e.calls = 2; e.depth = 3; e.steps = 5;
    const marker: ThrowCompletion = { type: "throw", value: { kind: "object", object: foreign.createObject() }, diagnostic: { phase: "runtime", name: "sentinel", message: "sentinel", loc }, origin: { kind: "guest" } };
    const fault = new Error("host sentinel");
    let inside = false; let returned: ValueCompletion = normal(); let escaped = false;
    const fn = builtin(foreign, (_r, _a, context, location): Completion => {
        inside = context.realm === foreign && e.calls === 3 && e.depth === 3;
        if (action === "host") throw fault;
        if (action === "tick") return context.tick(location);
        return marker;
    });
    try { returned = e.call(fn, UNDEFINED, [], loc); } catch (error) { if (error instanceof Error) escaped = error === fault; }
    check(inside && e.calls === 2 && e.depth === 3 && e.context.realm === realm, "R21-R23 cleanup");
    if (action === "guest") check(returned === marker && returned.value === marker.value && thrown(returned, "R21").diagnostic === marker.diagnostic && e.steps === 5, "R21 identity");
    if (action === "host") check(escaped && e.steps === 5, "R22 same host error");
    if (action === "tick") { resource(returned, "steps", 6, 5, "R23"); check(e.steps === 6, "R23 steps"); }
}
// R24-R27: no diagnostic-based inference and no constructor inspection.
for (const source of ["throw 'RangeError: call depth limit exceeded';", "throw {name:'TypeError'};", "missing;"]) {
    const realm = fresh(); const raw = run(source, realm); check(raw.phase === "runtime", "R24-R26 runtime");
    if (raw.phase === "runtime") check(thrown(raw.completion, source).origin.kind === (source === "missing;" ? "engine-diagnostic" : "guest"), "R24-R26 origin");
    const r = observe(source, fresh(), "body-observation", unit); const o = r.observation;
    check(o.kind === "throw" && o.valueKind === (source.includes("{") ? "object" : "string") && o.constructor.outcome === (source.includes("{") ? "unsupported" : "absent") && o.constructor.name === null && o.constructor.realmId === null && o.constructor.secondary === null, "R24-R26 projection");
    check(r.bodyEvaluated && r.location?.line === 1 && r.location.column === 1, "R24-R26 location");
}
{
    const realm = fresh(); const value: Value = { kind: "number", value: 8 }; const binding: Binding = { initialized: true, mutable: true, value }; realm.global.bindings.set("x", binding);
    check(realm.global.bindings.get("x") === binding && binding.initialized && binding.mutable, "R27 pre-observation binding");
    const r = observe("let x;", realm, "body-observation", unit);
    const raw = run("let x;", realm);
    check(raw.phase === "runtime" && raw.completion.type === "throw" && raw.completion.origin.kind === "engine-diagnostic", "R27 origin");
    check(r.bodyEvaluated, "R27 body");
    check(r.observation.kind === "throw", "R27 throw");
    check(r.diagnostic?.phase === "runtime" && r.diagnostic.name === "SyntaxError", "R27 diagnostic");
    check(r.location?.column === 1, "R27 location");
    check(realm.global.bindings.get("x") === binding, "R27 binding identity");
    check(binding.value === value && binding.initialized && binding.mutable, "R27 value identity and flags");
}
{
    const realm = fresh(); const object = realm.createObject();
    const value: Value = { kind: "object", object };
    const binding: Binding = { initialized: true, mutable: false, value };
    realm.global.bindings.set("x", binding);
    check(realm.global.bindings.get("x") === binding, "R27 object pre-observation roundtrip");
    const result = observe("let x;", realm, "body-observation", unit);
    const retained = realm.global.bindings.get("x");
    if (retained === undefined) throw new Error("R27 missing object binding");
    check(result.bodyEvaluated && result.observation.kind === "throw", "R27 object duplicate");
    check(retained === binding && retained.initialized && !retained.mutable && retained.value === value, "R27 object binding and Value identity");
    check(retained.value.kind === "object" && retained.value.object === object, "R27 guest object alias");
    object.bootstrapDefine("retained", { value: { kind: "number", value: 17 } });
    if (retained.value.kind === "object") {
        const property = retained.value.object.getOwnProperty("retained");
        check(property?.kind === "data" && property.value.kind === "number" && property.value.value === 17, "R27 observable alias mutation");
    }
}
// R28-R34: semantic RangeErrors, unsupported subset APIs, propagation and effects.
{
    const realm = fresh(); const e = new Evaluator(realm); const array = realm.createArray();
    array.bootstrapDefine("0", { value: { kind: "number", value: 9 }, writable: true, configurable: true, enumerable: true });
    const r = array.defineOwnProperty("length", { value: { kind: "number", value: -1 } }, e.context, loc);
    check(r.type === "throw" && r.origin.kind === "engine-diagnostic" && r.diagnostic.name === "RangeError", "R28");
    check(dataDescriptor(array.getOwnProperty("0"))?.value.kind === "number" && dataDescriptor(array.getOwnProperty("length"))?.value.kind === "number", "R28 retention");
    const element = array.getOwnProperty("0"); check(element?.kind === "data" && element.value.kind === "number" && element.value.value === 9, "R28 element");
    const length = array.getOwnProperty("length"); check(length?.kind === "data" && length.value.kind === "number" && length.value.value === 1, "R28 length");
}
class ObservedArray extends GuestArray {
    gets = "";
    override internalGet(key: PropertyKey, receiver: Value, context: OperationContext, location: Location): ValueCompletion {
        if (key === "length") this.gets += "L";
        if (key === "constructor") this.gets += "C";
        return super.internalGet(key, receiver, context, location);
    }
}
class NoReadObject extends GuestObject {
    reads = 0;
    override internalGet(_key: PropertyKey, _receiver: Value, context: OperationContext, _loc: Location): ValueCompletion { this.reads++; throw new Error("unexpected property read"); }
}
{
    const object = new NoReadObject(); const input: Value = { kind: "object", object };
    const number = toNumber(input, loc); const string = toString(input, loc);
    for (const r of [number, string]) {
        check(r.type === "throw", "R29/R30 throw");
        if (r.type === "throw") {
            check(r.origin.kind === "unsupported-operation" && r.origin.capabilityCode === (r === number ? "runtime.object-to-number" : "runtime.object-to-string"), "R29/R30 origin");
            check(r.diagnostic.loc === loc && r.diagnostic.message === "object-to-primitive conversion unsupported" && r.value.kind === "string" && r.value.value === "TypeError: object-to-primitive conversion unsupported", "R29/R30 legacy");
            check(projectThrow(r).kind === "unsupported-syntax", "R29/R30 projection");
        }
    }
    const marker: ThrowCompletion = { type: "throw", value: input, diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc }, origin: { kind: "guest" } };
    check(projectThrow(marker).kind === "throw" && object.reads === 0, "R25 no constructor read");
}
{
    const realm = fresh(); const e = new Evaluator(realm); const array = new ObservedArray(realm.arrayPrototype); let callbacks = 0;
    const callback = builtin(realm, (_r, _a, _c, _l) => { callbacks++; return normal(); });
    array.bootstrapDefine("constructor", { value: { kind: "number", value: 1 }, configurable: true });
    const r = thrown(mapObjectDefaultArray(array, callback, UNDEFINED, e.context, loc), "R31");
    check(r.origin.kind === "unsupported-operation" && r.origin.capabilityCode === "runtime.map-species" && callbacks === 0 && e.steps === 0 && array.gets === "LC", "R31");
    const object = realm.createObject(); object.bootstrapDefine("length", { value: { kind: "number", value: 4294967296 } });
    const bad = thrown(mapObjectDefaultArray(object, UNDEFINED, UNDEFINED, e.context, loc), "R32");
    check(bad.origin.kind === "engine-diagnostic" && bad.diagnostic.name === "TypeError" && bad.diagnostic.message === "map callback is not callable", "R32 callback first");
    const oversized = thrown(mapObjectDefaultArray(object, callback, UNDEFINED, e.context, loc), "R32 length");
    check(oversized.origin.kind === "engine-diagnostic" && oversized.diagnostic.name === "RangeError" && callbacks === 0, "R32 length semantic");
    const sparse = realm.createArray(); sparse.bootstrapDefine("length", { value: { kind: "number", value: 3 } }); const zero = new Evaluator(realm, 0);
    resource(mapObjectDefaultArray(sparse, callback, UNDEFINED, zero.context, loc), "steps", 1, 0, "R33");
    check(callbacks === 0 && sparse.ownPropertyKeys().length === 1 && dataDescriptor(sparse.getOwnProperty("length"))?.value.kind === "number", "R33 no mutation");
    const length = sparse.getOwnProperty("length"); check(length?.kind === "data" && length.value.kind === "number" && length.value.value === 3, "R33 length");
    const noReads = new NoReadObject(); const exhausted = new Evaluator(realm, 0);
    let sentinel: ThrowCompletion = resourceFailure("steps", 0, 0, "unreached", loc);
    const context = { realm, call: (_c: Value, _r: Value, _a: Value[], _l: Location): ValueCompletion => { throw new Error("unexpected call"); }, tick: (location: Location): ValueCompletion => { sentinel = thrown(exhausted.tick(location), "R34 tick"); return sentinel; } };
    const propagated = toPrimitive({ kind: "object", object: noReads }, "number", context, loc);
    check(propagated === sentinel && noReads.reads === 0 && propagated.value === sentinel.value && thrown(propagated, "R34").diagnostic === thrown(sentinel, "R34 sentinel").diagnostic && exhausted.steps === 1, "R34 exact propagation");
}
{
    const realm = fresh(); const r = observe("let x=1; x=2; throw 'stop';", realm, "body-observation", unit); const x = realm.global.bindings.get("x");
    check(x?.value.kind === "number" && x.value.value === 2 && r.location?.column === 15 && r.observation.kind === "throw", "R35 committed effects");
}
// R36 is additionally checked by the ten original sentinel assertions in the
// six migrated drivers; V04 verifies those edits are origin-only.
{
    const fault = new Error("output fault"); const realm = new Realm((_line) => { throw fault; }); let escaped = false;
    try { observe("let x=1; x=2; console.log('stop');", realm, "body-observation", unit); }
    catch (error) { if (error instanceof Error) escaped = error === fault; }
    const x = realm.global.bindings.get("x"); check(escaped && x?.value.kind === "number" && x.value.value === 2, "R37 host fault identity/effects");
}
{
    const first = fresh(); const second = fresh();
    check(observe("let x={};", first, "body-observation", unit).observation.kind === "normal", "R38 first");
    check(observe("let x={};", second, "body-observation", unit).observation.kind === "normal", "R38 second");
    const a = first.global.bindings.get("x")?.value; const b = second.global.bindings.get("x")?.value;
    check(a?.kind === "object" && b?.kind === "object" && a.object !== b.object && first.objectPrototype !== second.objectPrototype, "R38 isolation");
}
// Each invalid configured value is tested in each slot before parsing/effects.
for (const bad of [-1, NaN, 0.5, 9007199254740992, Infinity, -Infinity]) {
    for (const slot of ["steps", "calls"]) {
        const realm = fresh(); let rejected = false;
        try { observe("let x;", realm, "body-observation", unit, { steps: slot === "steps" ? bad : 100000, calls: slot === "calls" ? bad : 64 }); }
        catch (error) { if (error instanceof Error) rejected = error.message === "observation limits must be nonnegative safe integers"; }
        check(rejected && !realm.global.bindings.has("x"), "invalid observation limit " + slot);
    }
}
observedResource(observe("1;", fresh(), "body-observation", unit, { steps: 0, calls: 64 }), "steps", 1, 0, "observe zero steps");
observedResource(observe("console.log();", fresh(), "body-observation", unit, { steps: 100000, calls: 0 }), "calls", 0, 0, "observe zero calls");
console.log("structured-outcomes ok");
