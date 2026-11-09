import { readFileSync } from "node:fs";
import { planScriptDeclarations, type ScriptDeclarationPlan, type Declaration } from "../src/script-declarations.js";
import { instantiateGlobalDeclarations, type DeclarationMaterializer } from "../src/script-global-declarations.js";
import { GlobalEnvironment } from "../src/global-environment.js";
import { Realm } from "../src/realm.js";
import { GuestObject, normal, failure, resourceFailure, sameValue, UNDEFINED, type Value, type ValueCompletion, type OperationContext, type InternalBooleanCompletion, type ThrowCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function num(value: number): Value { return { kind: "number", value }; }
function plan(text: string): ScriptDeclarationPlan {
    const p = planScriptDeclarations({ id: "runtime-unit", text: '"use strict"; ' + text });
    if (p.kind !== "complete") throw new Error("plan setup: " + text);
    return p;
}
function unused(r: ValueCompletion): void { check(r.type === "normal" && r.value.kind === "undefined", "normal undefined"); }
function error(r: ValueCompletion, name: string, column: number): void {
    check(r.type === "throw" && r.diagnostic.phase === "runtime" && r.diagnostic.name === name && r.diagnostic.loc.line === 1 && r.diagnostic.loc.column === column && r.origin.kind === "engine-diagnostic", "error " + name + " at " + column);
}
function desc(o: GuestObject, name: string, value: Value, w: boolean = true, e: boolean = true, c: boolean = false): void {
    const d = o.getOwnProperty(name);
    check(d !== undefined && d.kind === "data" && sameValue(d.value, value) && d.writable === w && d.enumerable === e && d.configurable === c, "descriptor " + name);
}
function seed(o: GuestObject, name: string, w: boolean = true, e: boolean = true, c: boolean = true): void {
    o.bootstrapDefine(name, { value: num(7), writable: w, enumerable: e, configurable: c });
}
function tdz(e: GlobalEnvironment, name: string, context: OperationContext): void {
    check(e.hasLexicalDeclaration(name), "lexical " + name);
    error(e.getBindingValue(name, context, { line: 1, column: 99 }), "ReferenceError", 99);
}
function absent(e: GlobalEnvironment, name: string): void { check(!e.hasLexicalDeclaration(name) && e.globalObject.getOwnProperty(name) === undefined, "absent " + name); }

// Trusted stand-alone fault controls, not exotic Script globals. The trace records
// primitive ordering; the independent tick trace records every occurrence site.
class TracedEnvironment extends GlobalEnvironment {
    trace: string[] = [];
    fault = "";
    host = false;
    readonly sentinel = new Error("host sentinel");
    readonly abrupt: ThrowCompletion = { type: "throw", value: { kind: "object", object: new GuestObject() }, diagnostic: { phase: "runtime", name: "Sentinel", message: "original", loc: { line: 91, column: 23 } }, origin: { kind: "guest" } };
    visit(op: string): boolean {
        this.trace.push(op);
        if (this.fault !== op) return false;
        if (this.host) throw this.sentinel;
        return true;
    }
    override hasLexicalDeclaration(n: string): boolean { this.visit("L:" + n); return super.hasLexicalDeclaration(n); }
    override hasRestrictedGlobalProperty(n: string): InternalBooleanCompletion { return this.visit("R:" + n) ? this.abrupt : super.hasRestrictedGlobalProperty(n); }
    override canDeclareGlobalFunction(n: string): InternalBooleanCompletion { return this.visit("F?:" + n) ? this.abrupt : super.canDeclareGlobalFunction(n); }
    override canDeclareGlobalVar(n: string): InternalBooleanCompletion { return this.visit("V?:" + n) ? this.abrupt : super.canDeclareGlobalVar(n); }
    override createMutableBinding(n: string, loc: Location, realm: Realm | null): ValueCompletion { return this.visit("L+:" + n) ? this.abrupt : super.createMutableBinding(n, loc, realm); }
    override createGlobalFunctionBinding(n: string, v: Value, c: OperationContext, loc: Location, deletable = false): ValueCompletion { return this.visit("F+:" + n) ? this.abrupt : super.createGlobalFunctionBinding(n, v, c, loc, deletable); }
    override createGlobalVarBinding(n: string, c: OperationContext, loc: Location, deletable = false): ValueCompletion { return this.visit("V+:" + n) ? this.abrupt : super.createGlobalVarBinding(n, c, loc, deletable); }
}
class Harness {
    readonly realm = new Realm((_line: string) => { throw new Error("source output"); }, "script");
    readonly env: TracedEnvironment;
    readonly context: OperationContext;
    readonly ticks: number[] = [];
    readonly markers: Value[] = [];
    readonly declarations: Declaration[] = [];
    calls = 0;
    limit = 1000000;
    tickAbrupt: ThrowCompletion | null = null;
    current: ScriptDeclarationPlan | null = null;
    primitive = false;
    constructor(object: GuestObject = new GuestObject()) {
        this.env = new TracedEnvironment(object, object);
        this.context = { realm: this.realm,
            call: (_callee, _receiver, _args, _loc): ValueCompletion => { this.calls++; throw new Error("unexpected call"); },
            tick: (loc): ValueCompletion => {
                this.ticks.push(loc.column);
                if (this.ticks.length > this.limit) {
                    this.tickAbrupt = resourceFailure("steps", this.ticks.length, this.limit, "step limit exceeded", loc);
                    return this.tickAbrupt;
                }
                return normal();
            } };
    }
    readonly materialize: DeclarationMaterializer = (d, fn, env, unit, context): ValueCompletion => {
        check(this.current !== null && unit === this.current.unit && env === this.env && context === this.context && fn.declaration === d.id && fn.scope === d.functionScope, "materializer identity");
        if (this.env.visit("M:" + d.site.name)) return this.env.abrupt;
        if (this.primitive) return normal(num(1));
        const o = new GuestObject();
        o.bootstrapDefine("payload", { value: num(payload), writable: false, enumerable: true, configurable: false });
        const v: Value = { kind: "object", object: o };
        this.markers.push(v); this.declarations.push(d);
        check(o.callable === null, "noncallable marker");
        return normal(v);
    };
    run(p: ScriptDeclarationPlan): ValueCompletion {
        this.current = p;
        const realm = this.context.realm, call = this.context.call, tick = this.context.tick;
        const result = instantiateGlobalDeclarations(p, this.env, this.context, this.materialize);
        check(this.context.realm === realm && this.context.call === call && this.context.tick === tick && this.calls === 0, "context preserved");
        return result;
    }
}
const fields = readFileSync(process.argv[2], "utf8").trim().split("|");
const runtimeName = fields[0], payload = Number(fields[1]);
{
    const h = new Harness(), loc = { line: 1, column: 1 };
    unused(h.env.createGlobalVarBinding(runtimeName, h.context, loc, true));
    // ES2025 permits lexical shadowing of configurable eval-created globals.
    unused(h.run(plan("let " + runtimeName + ";")));
    tdz(h.env, runtimeName, h.context);
    desc(h.env.globalObject, runtimeName, UNDEFINED, true, true, true);
}
check((runtimeName === "seed" && payload === 7) || (runtimeName === "other" && payload === 11), "runtime input");
const duplicate = 'function f(){return 1;} var f; function g(){} function f(){return 2;}';

// G01: direct lexicals stay TDZ; initializer values are never installed.
{
    const h = new Harness(); unused(h.run(plan("let x=1;"))); tdz(h.env,"x",h.context); check(h.env.globalObject.getOwnProperty("x") === undefined,"no lexical property");
    const v = new Harness(); unused(v.run(plan("var x=1;"))); desc(v.env.globalObject,"x",UNDEFINED);
}
console.log("G01 PASS");
{
    const h = new Harness(); unused(h.run(plan("var x=1,y=x,z; var x;")));
    for (const n of ["x","y","z"]) desc(h.env.globalObject,n,UNDEFINED);
    check(h.env.trace.join("|") === "L:x|L:y|L:z|L:x|V?:x|V?:y|V?:z|V?:x|V+:x|V+:y|V+:z","G02 order");
    for (const text of ["var x,;","let x,y;"]) check(planScriptDeclarations({id:"bad",text:'"use strict"; '+text}).kind === "blocked","G02 blocked neighbor");
}
console.log("G02 PASS");
{
    const h = new Harness(), p = plan(duplicate); unused(h.run(p));
    check(h.env.trace.join("|") === "L:f|L:f|L:g|L:f|F?:f|F?:g|M:g|F+:g|M:f|F+:f","G03 reverse admission/source creation");
    check(h.ticks.join(",") === "24,43,55,70,70,55,43,24,24,43,55,70,55,55,70,70","G03 all occurrence ticks");
    check(h.declarations[0] === p.declarations[2] && h.declarations[1] === p.declarations[3],"winner identities");
    desc(h.env.globalObject,"g",h.markers[0]); desc(h.env.globalObject,"f",h.markers[1]);
}
console.log("G03 PASS");
const conflicts: [string, string[]][] = [["G04",["let x; var x;","var x; let x;","let x; {var x;}"]],["G05",["let x; let x;"]]];
for (const [id,texts] of conflicts) {
    for (const text of texts) check(planScriptDeclarations({id,text:'"use strict"; '+text}).kind === "conflict",id+" no plan");
    if (id === "G05") { const h = new Harness(); unused(h.run(plan("let x; {let x;}"))); tdz(h.env,"x",h.context); }
    console.log(id + " PASS");
}
{
    const h = new Harness(); unused(h.run(plan("var x;"))); error(h.run(plan("let x;")),"SyntaxError",19); desc(h.env.globalObject,"x",UNDEFINED);
    const v = new Harness(); seed(v.env.globalObject,"x"); unused(v.run(plan("let x;"))); tdz(v.env,"x",v.context); desc(v.env.globalObject,"x",num(7),true,true,true);
}
console.log("G06 PASS");
{
    for (const initialized of [false,true]) for (const source of ["var x;","function x(){}","let x;"]) {
        const h = new Harness(); unused(h.run(plan("let x;")));
        if (initialized) unused(h.env.initializeBinding("x",num(4),h.context,{line:1,column:1}));
        error(h.run(plan(source)),"SyntaxError",source === "function x(){}" ? 24 : 19); check(h.markers.length === 0,"G07 no materialization");
    }
    const h = new Harness(); unused(h.run(plan("let y;"))); unused(h.run(plan("var x;"))); desc(h.env.globalObject,"x",UNDEFINED);
}
console.log("G07 PASS");
{
    for (const w of [false,true]) for (const e of [false,true]) for (const c of [false,true]) {
        const h = new Harness(); seed(h.env.globalObject,"x",w,e,c); const r = h.run(plan("function x(){}"));
        if (c || (w && e)) { unused(r); desc(h.env.globalObject,"x",h.markers[0],c || w,c || e,false); }
        else { error(r,"TypeError",24); desc(h.env.globalObject,"x",num(7),w,e,c); check(h.markers.length === 0,"flag reject"); }
        const v = new Harness(); seed(v.env.globalObject,"x",w,e,c); unused(v.run(plan("var x;"))); desc(v.env.globalObject,"x",num(7),w,e,c);
    }
}
console.log("G08 PASS");
{
    for (const ext of [true,false]) for (const kind of ["var","function","let"]) {
        const proto = new GuestObject(); seed(proto,"x",false,false,false);
        const h = new Harness(new GuestObject(proto)); if (!ext) h.env.globalObject.preventExtensions();
        const r = h.run(plan(kind === "function" ? "function x(){}" : kind + " x;"));
        if (!ext && kind !== "let") { error(r,"TypeError",kind === "function" ? 24 : 19); absent(h.env,"x"); }
        else { unused(r); if (kind === "let") { tdz(h.env,"x",h.context); check(h.env.globalObject.getOwnProperty("x") === undefined,"inherited lexical"); } else desc(h.env.globalObject,"x",kind === "var" ? UNDEFINED : h.markers[0]); }
        desc(proto,"x",num(7),false,false,false);
    }
}
console.log("G09 PASS");
{
    for (const kind of ["var","function","let"]) for (const name of ["x","y"]) {
        const h = new Harness(); seed(h.env.globalObject,"x"); h.env.globalObject.preventExtensions();
        const r = h.run(plan(kind === "function" ? "function "+name+"(){}" : kind+" "+name+";"));
        if (name === "y" && kind !== "let") error(r,"TypeError",kind === "function" ? 24 : 19);
        else { unused(r); if (kind === "let") tdz(h.env,name,h.context); else desc(h.env.globalObject,name,kind === "var" ? num(7) : h.markers[0],true,true,kind === "var"); }
    }
}
console.log("G10 PASS");
{
    const p = plan("let fresh; var x; function f(){}");
    const h = new Harness(); unused(h.env.createMutableBinding("x",{line:1,column:1}, h.context.realm)); error(h.run(p),"SyntaxError",30); absent(h.env,"fresh"); absent(h.env,"f"); check(h.markers.length === 0,"prechecks no callbacks");
    const ok = new Harness(); unused(ok.run(p)); tdz(ok.env,"fresh",ok.context);
    const restricted = new Harness(); seed(restricted.env.globalObject,"fresh",true,true,false); error(restricted.run(p),"SyntaxError",19); check(restricted.ticks.join(",") === "19","restricted earlier");
}
console.log("G11 PASS");
{
    for (const text of ["let Infinity;","var Infinity;","function Infinity(){}","let Number;"]) {
        const h = new Harness(); const p = plan(text); h.current = p;
        const before = h.realm.globalObject.getOwnProperty(text === "let Number;" ? "Number" : "Infinity");
        const r = instantiateGlobalDeclarations(p,h.realm.globalEnvironment,h.context,h.materialize);
        if (text === "let Infinity;") error(r,"SyntaxError",19);
        else if (text === "function Infinity(){}") error(r,"TypeError",24);
        else unused(r);
        const name = text === "let Number;" ? "Number" : "Infinity";
        check(before !== undefined,"builtin before");
        if (before !== undefined) {
            if (before.kind !== "data") throw new Error("expected data descriptor");
            desc(h.realm.globalObject,name,before.value,before.writable,before.enumerable,before.configurable);
        }
        if (name === "Number") tdz(h.realm.globalEnvironment,name,h.context);
        check(h.markers.length === 0,"builtin no materialization");
    }
}
console.log("G12 PASS");
{
    const h = new Harness(); unused(h.run(plan("var x; var x;"))); check(h.env.trace.join("|") === "L:x|L:x|V?:x|V?:x|V+:x","repeated vars");
    const f = new Harness(); unused(f.run(plan("var x; function x(){}"))); check(f.env.trace.join("|") === "L:x|L:x|F?:x|M:x|F+:x","function suppresses var");
}
console.log("G13 PASS");
{
    const expected = [19,26,38,38,26,26,38,19,38,38,26];
    for (let budget = 0; budget <= 11; budget++) {
        const h = new Harness(); h.limit = budget; const r = h.run(plan("let l; var x; function f(){}"));
        check(h.ticks.join(",") === expected.slice(0,Math.min(budget+1,11)).join(","),"exact tick sequence " + budget);
        if (budget < 11) {
            check(r.type === "throw" && h.tickAbrupt !== null && r === h.tickAbrupt && r.origin.kind === "resource-limit" && r.origin.guardCode === "steps" && r.origin.count === budget+1 && r.origin.limit === budget && r.diagnostic.loc.column === expected[budget],"original resource result");
        } else unused(r);
        if (budget >= 8) tdz(h.env,"l",h.context); else absent(h.env,"l");
        check(h.markers.length === (budget >= 9 ? 1 : 0),"allocation prefix");
        if (budget >= 10) desc(h.env.globalObject,"f",h.markers[0]); else absent(h.env,"f");
        if (budget >= 11) desc(h.env.globalObject,"x",UNDEFINED); else absent(h.env,"x");
    }
}
console.log("G14 PASS");
{
    for (const host of [false,true]) for (const op of ["F?:f","M:g","F+:f"]) {
        const h = new Harness(); h.env.fault = op; h.env.host = host;
        let caught = false;
        try { const r = h.run(plan(duplicate)); check(!host && r === h.env.abrupt,"original guest record/value/location/origin"); }
        catch (e) { check(host && e instanceof Error && e === h.env.sentinel,"original host sentinel"); caught = true; }
        check(caught === host && h.env.trace[h.env.trace.length-1] === op,"no later operation");
        if (op === "F+:f") desc(h.env.globalObject,"g",h.markers[0]); else absent(h.env,"g");
        absent(h.env,"f");
    }
}
console.log("G15 PASS");
{
    const h = new Harness(); unused(h.run(plan("var x=sideEffect(); function f(){sideEffect();}")));
    desc(h.env.globalObject,"x",UNDEFINED); check(h.calls === 0 && h.markers.length === 1,"no source effects");
    const runtime = new Harness(); unused(runtime.run(plan("var "+runtimeName+"=sideEffect(); function f(){sideEffect();}")));
    desc(runtime.env.globalObject,runtimeName,UNDEFINED); desc(runtime.env.globalObject,"f",runtime.markers[0]);
    const marker = runtime.markers[0]; check(marker.kind === "object" && marker.object.callable === null,"marker only");
    if (marker.kind === "object") desc(marker.object,"payload",num(payload),false,true,false);
}
console.log("G16 PASS");

// Every remaining abrupt seam and creation prefix, including the lexical checks.
for (const host of [false,true]) for (const op of ["R:l","V?:x","L+:l","F?:f","M:f","F+:f","V+:x"]) {
    const h = new Harness(); h.env.fault = op; h.env.host = host;
    let caught = false;
    try { const r = h.run(plan("let l; var x; function f(){}")); check(!host && r === h.env.abrupt,"additional abrupt identity"); }
    catch (e) { check(host && e instanceof Error && e === h.env.sentinel,"additional host identity"); caught = true; }
    check(caught === host && h.env.trace[h.env.trace.length-1] === op,"additional stop");
    if (op === "M:f" || op === "F+:f" || op === "V+:x") tdz(h.env,"l",h.context); else absent(h.env,"l");
    if (op === "V+:x") desc(h.env.globalObject,"f",h.markers[0]); else absent(h.env,"f");
    absent(h.env,"x");
}
console.log("FAULTS PASS");

// Reusing a valid plan never reuses a precheck result across host mutations.
{
    const h = new Harness(), p = plan("var x;"); unused(h.run(p));
    unused(h.env.createMutableBinding("x",{line:1,column:1}, h.context.realm)); error(h.run(p),"SyntaxError",19);
    const f = new Harness(), fp = plan("function x(){}"); unused(f.run(fp)); unused(f.run(fp)); check(f.markers.length === 2,"fresh function each invocation"); desc(f.env.globalObject,"x",f.markers[1]);
    const v = new Harness(), vp = plan("var x;"); seed(v.env.globalObject,"x"); unused(v.run(vp)); desc(v.env.globalObject,"x",num(7),true,true,true);
    const closed = new Harness(), cp = plan("var x;"); closed.env.globalObject.preventExtensions(); error(closed.run(cp),"TypeError",19);
}
console.log("CURRENT PASS");

function boundary(p: ScriptDeclarationPlan, legacy: boolean, message: string): void {
    const h = new Harness();
    const c: OperationContext = { realm: legacy ? new Realm((_line: string) => {}) : h.realm, call: h.context.call, tick: h.context.tick };
    let caught = false;
    try { instantiateGlobalDeclarations(p,h.env,c,h.materialize); }
    catch (e) { check(e instanceof Error && e.message === message,"boundary message: " + message); caught = true; }
    check(caught && h.ticks.length === 0 && h.env.trace.length === 0 && h.markers.length === 0,"boundary before effects");
}
{
    const p = plan("function f(){}");
    const malformed: ScriptDeclarationPlan = {...p,scopes:[]};
    const nonstrict: ScriptDeclarationPlan = {...malformed,strictness:{...p.strictness,strict:false}};
    boundary(nonstrict,true,"Script Realm required"); boundary(nonstrict,false,"strict declaration plan required"); boundary(malformed,false,"invalid declaration plan");
    boundary({...p,scopes:[{...p.scopes[0],kind:"block"}]},false,"invalid declaration plan");
    boundary({...p,scopes:[{...p.scopes[0],id:1}]},false,"invalid declaration plan");
    boundary({...p,scopes:[{...p.scopes[0],varDeclarations:[99]},p.scopes[1]]},false,"invalid declaration plan");
    boundary({...p,declarations:[{...p.declarations[0],id:3}]},false,"invalid declaration plan");
    boundary({...p,functions:[]},false,"invalid declaration plan");
    boundary({...p,functions:[{...p.functions[0],scope:99}]},false,"invalid declaration plan");
    const h = new Harness(); h.primitive = true; let caught = false;
    try { h.run(p); } catch(e) { check(e instanceof Error && e.message === "declaration materializer requires object","primitive normal boundary"); caught = true; }
    check(caught && h.ticks.length === 4,"primitive fails before creation tick"); absent(h.env,"f");
    const empty = new Harness(); unused(empty.run(plan(""))); check(empty.ticks.length === 0,"strict directive only");
    const nested = new Harness(); unused(nested.run(plan("{let x=1; function f(){return x;}}"))); absent(nested.env,"x"); absent(nested.env,"f"); check(nested.markers.length === 0,"no block instantiation");
}
console.log("BOUNDARY PASS");

// Flat large lists remain iterative, including interruptions in repeated scans.
{
    const h = new Harness(); const p = plan("var x;".repeat(12000)); unused(h.run(p)); desc(h.env.globalObject,"x",UNDEFINED); check(h.ticks.length === 36001,"large duplicate count");
    const cut = new Harness(); cut.limit = 24001; const stopped = cut.run(p); check(stopped.type === "throw" && cut.tickAbrupt !== null && stopped === cut.tickAbrupt,"large interrupted identity"); absent(cut.env,"x");
    let source = ""; for(let i=0;i<6000;i++) source += "var x"+i+";";
    const distinct = new Harness(); unused(distinct.run(plan(source))); check(distinct.ticks.length === 24000,"large unique count");
    for(let i=0;i<6000;i++) desc(distinct.env.globalObject,"x"+i,UNDEFINED);
}
console.log("LARGE PASS");

// Host tick exceptions escape at every boundary with exactly the same prefix.
for (let stop = 1; stop <= 11; stop++) {
    const h = new Harness(), sentinel = new Error("tick sentinel");
    const original = h.context.tick;
    h.context.tick = (loc): ValueCompletion => {
        const result = original(loc);
        if (h.ticks.length === stop) throw sentinel;
        return result;
    };
    const p = plan("let l; var x; function f(){}"), realm = h.context.realm;
    let caught = false;
    try { h.run(p); } catch(e) { check(e instanceof Error && e === sentinel,"tick sentinel identity"); caught = true; }
    check(caught && h.ticks.length === stop && h.context.realm === realm && h.calls === 0,"host tick state");
    if(stop > 8) tdz(h.env,"l",h.context); else absent(h.env,"l");
    if(stop > 10) desc(h.env.globalObject,"f",h.markers[0]); else absent(h.env,"f");
    absent(h.env,"x");
}
// Runtime names are exercised for all three declaration kinds, beyond the G16
// initializer/body control. Inputs are read after compilation in both lanes.
for (const kind of ["let","var","function"]) {
    const h = new Harness();
    const p = plan(kind === "function" ? "function "+runtimeName+"(){}" : kind+" "+runtimeName+";");
    unused(h.run(p));
    if(kind === "let") tdz(h.env,runtimeName,h.context);
    else desc(h.env.globalObject,runtimeName,kind === "var" ? UNDEFINED : h.markers[0]);
}
// More than one lexical/function verifies source-order creation within each phase.
{
    const h = new Harness();
    unused(h.run(plan("let a; let b; var x; var y; function f(){} function g(){}")));
    check(h.env.trace.join("|") === "L:a|R:a|L:b|R:b|L:x|L:y|L:f|L:g|F?:g|F?:f|V?:x|V?:y|L+:a|L+:b|M:f|F+:f|M:g|F+:g|V+:x|V+:y","multiple creation order");
    tdz(h.env,"a",h.context); tdz(h.env,"b",h.context);
}
{
    const h = new Harness(); unused(h.run(plan("{var x;} if(false){var y;} while(false){var z;} function f(){var inner;}")));
    for(const n of ["x","y","z"]) desc(h.env.globalObject,n,UNDEFINED);
    absent(h.env,"inner"); check(h.markers.length === 1 && h.calls === 0,"nested vars without body execution");
}
