import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { prepareStrictScript, type ExecutableScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { UNDEFINED, GuestObject, normal, failure, type Value, type ValueCompletion, type OperationContext, type ThrowCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function prepare(source: string, realm: Realm, id = "execution"): ExecutableScript {
    const prepared = prepareStrictScript({ id, text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("preparation: " + prepared.kind);
    return prepared.record;
}
function idle(session: ScriptSession): void {
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "restored idle state");
}
function number(completion: ValueCompletion, expected: number): void {
    check(completion.type === "normal" && completion.value.kind === "number" && completion.value.value === expected, "expected number " + expected);
}
const input = readFileSync(process.argv[2], "utf8").trim().split("|");
check(input.length === 2 && (input[0] === "seed" && input[1] === "7" || input[0] === "other" && input[1] === "11"), "runtime input");
const expected = input[0] === "seed" ? 7 : 11;
const realm = new Realm((_line: string) => {}, "script");
const session = createScriptSession();
const result = evaluateScript(session, prepare('"use strict";function ' + input[0] + '(){return ' + input[1] + ';}' + input[0] + '();', realm));
check(result.phase === "body", "body phase");
number(result.completion, expected);
idle(session);
console.log("PASS runtime function " + input[0]);

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(source: string, r = fresh(), s = createScriptSession()): ValueCompletion {
    const result = evaluateScript(s, prepare(source, r));
    check(result.phase === "body", "expected body: " + source);
    idle(s);
    return result.completion;
}
function scalar(result: ValueCompletion, expected: number | string | undefined): void {
    check(result.type === "normal", "normal scalar");
    if (result.type !== "normal") throw new Error("abrupt scalar");
    if (expected === undefined) check(result.value.kind === "undefined", "undefined scalar");
    else if (typeof expected === "number") number(result, expected);
    else check(result.value.kind === "string" && result.value.value === expected, "string scalar " + expected);
}
function thrown(result: ValueCompletion, name: string): ThrowCompletion {
    if (result.type !== "throw") throw new Error("expected throw " + name);
    check(result.diagnostic.name === name, "throw name " + name);
    return result;
}
function value(result: ValueCompletion): Value {
    if (result.type !== "normal") throw new Error("expected value");
    return result.value;
}
function object(v: Value): GuestObject { if (v.kind !== "object") throw new Error("expected object"); return v.object; }
const at: Location = { line: 1, column: 1 };
function hostContext(r: Realm): OperationContext {
    return { realm: r, call: (_c: Value, _r: Value, _a: Value[], _l: Location): ValueCompletion => { throw new Error("host projection cannot call"); },
        tick: (_l: Location): ValueCompletion => normal() };
}
function hostFault(action: () => void, message: string): void {
    let caught = false;
    try { action(); } catch (error) { if (!(error instanceof Error) || error.message !== message) throw error; caught = true; }
    check(caught, "host rejection " + message);
}
function own(r: Realm, name: string): Value | null {
    const descriptor = r.globalEnvironment.globalObject.getOwnProperty(name);
    return descriptor === undefined ? null : descriptor.kind === "data" ? descriptor.value : null;
}
const cases: { id: string; source: string; expected: number | string | undefined }[] = [
    { id: "H3-empty", source: '"use strict";for(;;)break;', expected: undefined },
    { id: "H3-postfix", source: '"use strict";let x=7;x++;', expected: 7 },
    { id: "H2-empty", source: '"use strict";switch(1){}', expected: undefined },
    { id: "H1-empty", source: '"use strict";try{}catch(e){}', expected: undefined },
    { id: "P03", source: '"use strict";', expected: "use strict" },
    { id: "G02", source: '"use strict";var x=1,y=x,z;var x;x+y;', expected: 2 },
    { id: "G03", source: '"use strict";f();function f(){return 1;}function g(){}function f(){return 2;}', expected: 2 },
    { id: "L02+", source: '"use strict";function f(){return x;}let x=1;f();', expected: 1 },
    { id: "L03", source: '"use strict";function f(a){var a;return a;}f(7);', expected: 7 },
    { id: "L03missing", source: '"use strict";function f(a){var a;return a;}f();', expected: undefined },
    { id: "L04", source: '"use strict";function f(a){var a;function a(){return 2;}return a();}f(7);', expected: 2 },
    { id: "L05var", source: '"use strict";if(false){var x=1;}x;', expected: undefined },
    { id: "L05let", source: '"use strict";if(false){let y=1;}typeof y;', expected: "undefined" },
    { id: "L06", source: '"use strict";var x=1;{let x=2;var y=x;}x+y;', expected: 3 },
    { id: "L08", source: '"use strict";let a;let b;let i=0;while(i<2){let x=i;function f(){return x;}if(i===0){a=f;}else{b=f;}i+=1;}a()+b();', expected: 1 },
    { id: "L09", source: '"use strict";{function f(){return x;}let x=1;this.saved=f;}this.saved();', expected: 1 },
    { id: "L10property", source: '"use strict";let o={arguments:1};o.arguments;', expected: 1 },
    { id: "T05", source: '"use strict";let x=1;x+=(x=3);x;', expected: 4 },
    { id: "F07", source: '"use strict";let o={arguments:1,caller:2};o["arg"+"uments"]=7;o.caller=11;o.arguments+o["caller"];', expected: 18 },
    { id: "F07missing", source: '"use strict";let o={};o.arguments;', expected: undefined },
    { id: "C01", source: '"use strict";1;let x;', expected: 1 },
    { id: "C01undefined", source: '"use strict";1;void 0;', expected: undefined },
    { id: "C02", source: '"use strict";1;{2;} ;', expected: 2 },
    { id: "C02empty", source: '"use strict";1;{};', expected: 1 },
    { id: "C03false", source: '"use strict";1;if(false){2;}', expected: undefined },
    { id: "C03true", source: '"use strict";1;if(true){;}', expected: undefined },
    { id: "C04", source: '"use strict";let x=0;while(x<2){x+=1;x;}', expected: 2 },
    { id: "C04zero", source: '"use strict";while(false){2;}', expected: undefined },
    { id: "C05", source: '"use strict";while(true){2;break;}', expected: 2 },
    { id: "C05if", source: '"use strict";while(true){2;if(true){break;}}', expected: undefined },
    { id: "C06", source: '"use strict";let x=0;while(x<2){x+=1;7;continue;}', expected: 7 },
    { id: "C06fallthrough", source: '"use strict";function f(){7;}f();', expected: undefined },
    { id: "C06return", source: '"use strict";function f(){return 7;}f();', expected: 7 },
    { id: "A13", source: '"use strict";while(true){2;{break;}}', expected: 2 },
];
for (const item of cases) scalar(run(item.source), item.expected);

for (const source of ['"use strict";let x=x;', '"use strict";function f(){return x;}f();let x=1;',
    '"use strict";{function f(){return x;}this.saved=f;this.saved();let x=1;}']) thrown(run(source), "ReferenceError");
{
    const r = fresh();
    scalar(run('"use strict";let x=1;this.x;', r), undefined);
    check(own(r, "x") === null, "G01 lexical not property");
    scalar(run('"use strict";x;', r), 1);
    const failed = evaluateScript(createScriptSession(), prepare('"use strict";this.effect=9;var x;', r));
    check(failed.phase === "instantiation", "G04 phase"); thrown(failed.completion, "SyntaxError");
    check(own(r, "effect") === null, "G04 no body");
    run('"use strict";this.effect=9;var y;', r);
    scalar(run('"use strict";this.effect;', r), 9);
}
{
    const r = fresh(); run('"use strict";var x=1;', r);
    const failed = evaluateScript(createScriptSession(), prepare('"use strict";let y=2;let x;', r));
    check(failed.phase === "instantiation", "G05 phase"); thrown(failed.completion, "SyntaxError");
    scalar(run('"use strict";typeof y;', r), "undefined"); scalar(run('"use strict";x;', r), 1);
}
{
    const r = fresh(); run('"use strict";this.x=1;', r);
    scalar(run('"use strict";let x=2;x+this.x;', r), 3);
}
for (let flags = 0; flags < 8; flags++) {
    const r = fresh(), s = createScriptSession();
    r.defineScriptGlobal("p", { value: { kind: "number", value: 7 }, writable: (flags & 4) !== 0, enumerable: (flags & 2) !== 0, configurable: (flags & 1) !== 0 });
    const rec = prepare('"use strict";function p(){return 2;}p();', r);
    const result = evaluateScript(s, rec);
    const admitted = (flags & 1) !== 0 || (flags & 6) === 6;
    if (admitted) { scalar(result.completion, 2); check(rec.inspectMaterializations().completed === 1, "G07 factory"); }
    else { check(result.phase === "instantiation", "G07 phase"); thrown(result.completion, "TypeError"); check(rec.inspectMaterializations().completed === 0, "G07 no factory"); }
    idle(s);
}
{
    const r = fresh();
    r.globalEnvironment.globalObject.preventExtensions();
    const result = evaluateScript(createScriptSession(), prepare('"use strict";this.effect=9;var fresh;', r));
    check(result.phase === "instantiation", "G08 phase"); thrown(result.completion, "TypeError");
    check(own(r, "effect") === null && own(r, "fresh") === null, "G08 no effects");
    scalar(run('"use strict";let fresh=2;fresh;', r), 2);
}
{
    const r = fresh();
    thrown(run('"use strict";missing=(this.missing=5);', r), "ReferenceError");
    scalar(run('"use strict";this.missing;', r), 5);
    const other = fresh(); thrown(run('"use strict";missing+=(this.missing=5);', other), "ReferenceError");
    check(own(other, "missing") === null, "T05 get precedes RHS");
}
{
    const r = fresh(), s = createScriptSession({ maxSteps: 20, maxCalls: 64 });
    scalar(run('"use strict";this.a=1;', r, s), 1); check(s.inspect().steps === 7, "A16 seed7");
    const exhausted = thrown(run('"use strict";while(true){}', r, s), "RangeError");
    check(exhausted.origin.kind === "resource-limit" && exhausted.origin.count === 21 && exhausted.diagnostic.loc.column === 25, "A16 cumulative exhaustion");
    thrown(run('"use strict";1;', r, s), "RangeError"); check(s.inspect().steps === 22, "A16 never reset");
    check(own(r, "a") !== null, "A16 retained side effect");
}
{
    const r = fresh(), s = createScriptSession();
    const result = thrown(run('"use strict";function f(){return f();}f();', r, s), "RangeError");
    check(result.origin.kind === "resource-limit" && result.origin.guardCode === "calls" && result.origin.count === 64, "A17 default calls");
}
for (const bad of [-1, 1.5, NaN, Infinity]) {
    hostFault(() => { createScriptSession({ maxSteps: bad, maxCalls: 64 }); }, "invalid Script limits");
    hostFault(() => { createScriptSession({ maxSteps: 100, maxCalls: bad }); }, "invalid Script limits");
}
console.log("PASS semantic matrix basic globals locals references completions budgets");

// Literal pre-implementation oracle copied from the frozen design, never execution.
const restrictedTraces: {id:string;source:string;columns:number[];effect:boolean;lexical:boolean}[] = [
    {
        "id": "f.arguments:read",
        "source": "\"use strict\";function f(){}f.arguments;",
        "columns": [
            23,
            23,
            23,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            28,
            28,
            30
        ],
        "effect": false,
        "lexical": false
    },
    {
        "id": "f.arguments:set",
        "source": "\"use strict\";function f(){}let k=\"caller\";f.arguments=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45,
            56,
            56,
            61,
            68
        ],
        "effect": true,
        "lexical": true
    },
    {
        "id": "f.arguments:compound",
        "source": "\"use strict\";function f(){}let k=\"caller\";f.arguments+=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45
        ],
        "effect": false,
        "lexical": true
    },
    {
        "id": "f.caller:read",
        "source": "\"use strict\";function f(){}f.caller;",
        "columns": [
            23,
            23,
            23,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            28,
            28,
            30
        ],
        "effect": false,
        "lexical": false
    },
    {
        "id": "f.caller:set",
        "source": "\"use strict\";function f(){}let k=\"caller\";f.caller=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45,
            53,
            53,
            58,
            65
        ],
        "effect": true,
        "lexical": true
    },
    {
        "id": "f.caller:compound",
        "source": "\"use strict\";function f(){}let k=\"caller\";f.caller+=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45
        ],
        "effect": false,
        "lexical": true
    },
    {
        "id": "f[\"arg\"+\"uments\"]:read",
        "source": "\"use strict\";function f(){}f[\"arg\"+\"uments\"];",
        "columns": [
            23,
            23,
            23,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            28,
            28,
            30,
            30,
            36
        ],
        "effect": false,
        "lexical": false
    },
    {
        "id": "f[\"arg\"+\"uments\"]:set",
        "source": "\"use strict\";function f(){}let k=\"caller\";f[\"arg\"+\"uments\"]=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45,
            45,
            51,
            62,
            62,
            67,
            74
        ],
        "effect": true,
        "lexical": true
    },
    {
        "id": "f[\"arg\"+\"uments\"]:compound",
        "source": "\"use strict\";function f(){}let k=\"caller\";f[\"arg\"+\"uments\"]+=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45,
            45,
            51
        ],
        "effect": false,
        "lexical": true
    },
    {
        "id": "f[k]:read",
        "source": "\"use strict\";function f(){}let k=\"caller\";f[k];",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45
        ],
        "effect": false,
        "lexical": true
    },
    {
        "id": "f[k]:set",
        "source": "\"use strict\";function f(){}let k=\"caller\";f[k]=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45,
            49,
            49,
            54,
            61
        ],
        "effect": true,
        "lexical": true
    },
    {
        "id": "f[k]:compound",
        "source": "\"use strict\";function f(){}let k=\"caller\";f[k]+=(this.effect=7);",
        "columns": [
            32,
            23,
            23,
            23,
            32,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            34,
            43,
            43,
            43,
            45
        ],
        "effect": false,
        "lexical": true
    },
    {
        "id": "typeof",
        "source": "\"use strict\";function f(){}typeof f.arguments;",
        "columns": [
            23,
            23,
            23,
            23,
            14,
            23,
            1,
            1,
            14,
            28,
            28,
            35,
            35,
            37
        ],
        "effect": false,
        "lexical": false
    }
];
for (const trace of restrictedTraces) {
    for (const seed of [0, 7]) {
        for (let budget = 0; budget <= trace.columns.length; budget++) {
            const r = fresh(), s = createScriptSession({ maxSteps: seed + budget, maxCalls: 64 });
            if (seed !== 0) run('"use strict";this.a=1;', r, s);
            const record = prepare(trace.source, r, trace.id);
            const result = evaluateScript(s, record);
            const fault = thrown(result.completion, budget === trace.columns.length ? "TypeError" : "RangeError");
            const setupTicks = trace.lexical ? 8 : 6;
            check(result.phase === (budget < setupTicks ? "instantiation" : "body"), "restricted phase " + trace.id);
            if (budget < trace.columns.length) {
                check(fault.origin.kind === "resource-limit" && fault.origin.guardCode === "steps" && fault.origin.count === seed + budget + 1, "restricted resource prefix");
                check(fault.diagnostic.loc.line === 1 && fault.diagnostic.loc.column === trace.columns[budget], "restricted location " + trace.id + " prefix " + budget);
            } else check(fault.origin.kind === "engine-diagnostic", "actual restricted endpoint");
            check(record.inspectMaterializations().completed === (budget >= setupTicks - 1 ? 1 : 0), "allocation prefix");
            const fn = own(r, "f");
            check((fn !== null) === (budget >= setupTicks), "publication prefix");
            if (fn !== null) {
                check(object(fn).getOwnProperty("arguments") === undefined && object(fn).getOwnProperty("caller") === undefined, "no restricted shadow");
                const d = r.globalEnvironment.globalObject.getOwnProperty("f");
                check(d !== undefined && d.kind === "data" && d.writable && d.enumerable && !d.configurable, "published descriptor");
            }
            check((own(r, "effect") !== null) === (trace.effect && budget === trace.columns.length), "RHS prefix effect");
            if (trace.lexical) {
                const k = r.readScriptGlobal("k", hostContext(r), at);
                if (budget < 5) check(k.type === "throw" && k.diagnostic.message === "k is not defined", "k absent prefix");
                else if (budget < 13) check(k.type === "throw" && k.diagnostic.message === "k is not initialized", "k TDZ prefix");
                else scalar(k, "caller");
            }
            const provenance = s.inspect().lastAbrupt;
            check(provenance !== null && provenance.realm === r && provenance.record === record && provenance.unitId === trace.id, "prefix source provenance");
            idle(s);
        }
    }
    const r = fresh(), s = createScriptSession({ maxSteps: 1000, maxCalls: 0 });
    const fault = thrown(run(trace.source, r, s), "RangeError");
    check(fault.origin.kind === "resource-limit" && fault.origin.guardCode === "calls", "restricted zero calls");
    check((own(r, "effect") !== null) === trace.effect, "zero calls RHS ordering");
}
console.log("PASS thirteen restricted traces every resource prefix seeded and fresh");

for (const item of [
    { source: '"use strict";1;', columns: [1,1,14,14], answer: 1 },
    { source: '"use strict";this.a=1;', columns: [1,1,14,14,14,19,21], answer: 1 },
    { source: '"use strict";function f(){return 7;}f();', columns: [23,23,23,23,14,23,1,1,14,37,37,14,27,34], answer: 7 },
    { source: '"use strict"; let l; var x; function f(){}', columns: [19,26,38,38,26,26,38,19,38,29,38,26,1,1,15,22,29], answer: undefined },
    { source: '"use strict";{let x;function g(){}let y;}', columns: [1,1,14,14,19,30,21,30,39,15,21,35], answer: undefined },
]) {
    for (const seed of [0,7]) for (let budget=0; budget<=item.columns.length; budget++) {
        const r=fresh(), s=createScriptSession({maxSteps:seed+budget,maxCalls:64});
        if (seed!==0) run('"use strict";this.seed=1;',r,s);
        const result=evaluateScript(s,prepare(item.source,r));
        if (budget<item.columns.length) {
            const fault=thrown(result.completion,"RangeError");
            check(fault.diagnostic.loc.column===item.columns[budget],"setup/root prefix " + budget + " " + item.source);
            check(s.inspect().steps===seed+budget+1,"shared prefix steps");
        } else {
            // Declaration-only lists retain the directive's earlier value.
            scalar(result.completion,item.answer===undefined ? "use strict" : item.answer);
            check(s.inspect().steps===seed+budget,"complete prefix steps");
        }
        idle(s);
    }
}
console.log("PASS literal root function block global prefix counts");

for (const item of [
    { source:'"use strict";let x;x=function(){};save(x);x=(function(){});save(x);(x)=function(){};save(x);((x))=(function(){});save(x);', names:["x","x","",""] },
    { source:'"use strict";let x;(x=function(){});save(x);', names:["x"] },
    { source:'"use strict";let x;let y;x=(y=function(){});save(x);save(y);', names:["y","y"] },
    { source:'"use strict";let x=function(){};save(x);var y=(function(){});save(y);let o={k:(function(){})};save(o.k);o.k=function(){};save(o.k);x=true?function(){}:function(){};save(x);', names:["x","y","k","",""] },
]) {
    const r=fresh(); const captured: Value[]=[];
    const save=r.createBuiltin("save",1,(_receiver,args,_context,_loc):ValueCompletion => {captured.push(args[0]);return normal();});
    r.defineScriptGlobal("save",{value:{kind:"object",object:save},writable:true,configurable:true});
    run(item.source,r);
    check(captured.length===item.names.length,"naming count");
    for(let i=0;i<captured.length;i++) {
        const f=object(captured[i]); const name=f.getOwnProperty("name");
        check(name!==undefined && name.kind==="data" && name.value.kind==="string" && name.value.value===item.names[i],"direct naming");
        const callable=f.callable;
        check(callable!==null && callable.kind==="script-guest" && callable.sourceText()==="function(){}","source independent of name");
    }
    if(item.names.length===2) check(captured[0]===captured[1],"nested assignment identity");
}
console.log("PASS N01-N04 original-node naming and source");

function define(r: Realm, name: string, v: Value): void {
    r.defineScriptGlobal(name, { value:v, writable:true, enumerable:true, configurable:true });
}
function sameFrame(a: ReturnType<ScriptSession["inspect"]>, b: ReturnType<ScriptSession["inspect"]>): void {
    check(a.calls===b.calls && a.depth===b.depth,"restored nonzero counters");
    const x=a.active, y=b.active;
    check(x!==null && y!==null,"active snapshots");
    if(x===null || y===null) throw new Error("missing frames");
    check(x.realm===y.realm && x.record===y.record && x.scopeId===y.scopeId && x.lexical===y.lexical && x.variable===y.variable &&
        x.thisValue===y.thisValue && x.function===y.function && x.phase===y.phase && x.strict && y.strict && x.privateEnvironment===null && y.privateEnvironment===null,"restored exact frame");
}
{
    const a=fresh(), b=fresh(), sa=createScriptSession(), sb=createScriptSession();
    const sentinel=new Error("nested session sentinel");
    let ac:OperationContext|null=null, bc:OperationContext|null=null;
    let raw=0, inside=0;
    const leaf=a.createBuiltin("leaf",0,(_receiver,_args,context,_loc):ValueCompletion=>{
        check(context===ac && context.realm===a,"captured owner context");raw++;return normal({kind:"number",value:expected});
    });
    const leafValue:Value={kind:"object",object:leaf};
    const inner=b.createBuiltin("inner",0,(_receiver,_args,context,_loc):ValueCompletion=>{
        inside++;bc=context;
        const aBefore=sa.inspect(), bBefore=sb.inspect();
        check(ac!==null,"active A capability");
        if(ac===null) throw new Error("missing A context");
        const copied={realm:b,call:ac.call,tick:ac.tick};
        scalar(copied.call(leafValue,UNDEFINED,[],at),expected);
        copied.tick(at);
        sameFrame(aBefore,sa.inspect());sameFrame(bBefore,sb.inspect());
        check(sa.inspect().steps===aBefore.steps+1 && sb.inspect().steps===bBefore.steps,"cross-owner budgets");
        throw sentinel;
    });
    define(b,"inner",{kind:"object",object:inner});
    const br=prepare('"use strict";{inner();}',b,"B nested host fault");
    let outerRecord:ExecutableScript;
    const outer=a.createBuiltin("outer",0,(_receiver,_args,context,loc):ValueCompletion=>{
        ac=context;
        const before=sa.inspect();
        check(before.calls>0 && before.depth>0 && before.active!==null && before.active.record===outerRecord,"nonzero active A");
        const invoke=leaf.callable;
        if(invoke===null || invoke.kind!=="builtin") throw new Error("leaf callable");
        hostFault(()=>{invoke.invoke(UNDEFINED,[],context,loc);},"Script execution unavailable");
        check(raw===0,"direct invocation denied");
        let caught=false;
        try{evaluateScript(sb,br);}catch(error){if(!(error instanceof Error)||error!==sentinel)throw error;caught=true;}
        check(caught,"B sentinel escaped to active A");
        idle(sb);sameFrame(before,sa.inspect());
        check(context.realm===a,"canonical realm restored after B");
        const detachedCall=context.call, detachedTick=context.tick;
        scalar(detachedCall(leafValue,UNDEFINED,[],loc),expected);detachedTick(loc);
        const snapshot=sa.inspect();
        if(snapshot.active===null)throw new Error("snapshot");
        // Detached containers may be changed by trusted inspection without changing frames.
        snapshot.active={...snapshot.active,realm:b,scopeId:999};snapshot.calls=999;
        sameFrame(before,sa.inspect());
        hostFault(()=>{evaluateScript(sa,outerRecord);},"Script session already active");
        return normal({kind:"number",value:expected});
    });
    define(a,"outer",{kind:"object",object:outer});
    outerRecord=prepare('"use strict";function f(){return outer();}f();',a,"A active");
    scalar(evaluateScript(sa,outerRecord).completion,expected);
    check(raw===2 && inside===1,"nested session dispatch counts");idle(sa);idle(sb);
    if(ac===null||bc===null)throw new Error("retained contexts");
    const retainedA:OperationContext=ac, retainedB:OperationContext=bc;
    hostFault(()=>{retainedA.tick(at);},"inactive Script session");
    hostFault(()=>{retainedA.call(leafValue,UNDEFINED,[],at);},"inactive Script session");
    hostFault(()=>{retainedB.tick(at);},"inactive Script session");
    // Reusing A's retained functions in a later active A unit is explicitly allowed.
    const later=a.createBuiltin("later",0,(_receiver,_args,context,loc):ValueCompletion=>{
        check(context===retainedA,"stable context across source units");
        return retainedA.call(leafValue,UNDEFINED,[],loc);
    });
    define(a,"later",{kind:"object",object:later});
    scalar(run('"use strict";later();',a,sa),expected);check(raw===3,"retained capability later unit");
    // Active B cannot activate idle A; then let B's exact sentinel escape the root.
    const idleA=b.createBuiltin("idleA",0,(_receiver,_args,_context,_loc):ValueCompletion=>{
        hostFault(()=>{retainedA.tick(at);},"inactive Script session");
        hostFault(()=>{retainedA.call(leafValue,UNDEFINED,[],at);},"inactive Script session");
        throw sentinel;
    });
    define(b,"idleA",{kind:"object",object:idleA});
    let caught=false;
    try{run('"use strict";{idleA();}',b,sb);}catch(error){if(!(error instanceof Error)||error!==sentinel)throw error;caught=true;}
    check(caught,"uncaught host identity");idle(sb);idle(sa);
}
console.log("PASS captured owner two active sessions escaping B sentinel restored A exact frames");

{
    const a=fresh(), b=fresh(), s=createScriptSession();
    const ar=prepare('"use strict";function f(){return {};}function bad(){throw 7;}f;',a,"same-id");
    const f=value(evaluateScript(s,ar).completion);
    const bad=own(a,"bad");if(bad===null)throw new Error("bad function");
    const duplicate=prepare('"use strict";function f(){return {};}function bad(){throw 7;}f;',a,"same-id");
    check(duplicate!==ar,"equal ID record identity");
    define(b,"f",f);define(b,"bad",bad);
    const br=prepare('"use strict";f();',b,"same-id");
    check(object(value(evaluateScript(s,br).completion)).getPrototypeOf()===a.objectPrototype,"defining Realm allocation");
    const thrownRecord=prepare('"use strict";bad();',b,"B caller");
    const result=thrown(evaluateScript(s,thrownRecord).completion,"Uncaught");
    check(result.value.kind==="number"&&result.value.value===7,"cross Realm guest throw");
    const provenance=s.inspect().lastAbrupt;
    check(provenance!==null&&provenance.realm===a&&provenance.record===ar&&provenance.unitId==="same-id"&&provenance.loc.column===53,"first capture callee provenance");
    idle(s);
    for(const source of ['"use strict";f["caller"];','"use strict";f["arguments"]=7;']) {
        const rec=prepare(source,b,"B restricted");thrown(evaluateScript(s,rec).completion,"TypeError");
        const p=s.inspect().lastAbrupt;
        check(p!==null&&p.realm===a&&p.record===rec&&p.unitId==="B restricted","thrower allocation Realm caller source");idle(s);
    }
    const af=object(f).callable;
    check(af!==null&&af.kind==="script-guest"&&af.record===ar&&af.sourceText()==="function f(){return {};}","retained original code");
    const legacy=new Realm((_line:string)=>{});
    const legacyFn:Value={kind:"object",object:legacy.createBuiltin("legacy",0,(_r,_a,_c,_l)=>normal())};
    const cross=a.createBuiltin("cross",0,(_r,_args,c,l):ValueCompletion=>{
        hostFault(()=>{c.call(legacyFn,UNDEFINED,[],l);},"cross-profile callable invocation");return normal();
    });
    define(a,"cross",{kind:"object",object:cross});run('"use strict";cross();',a,s);
}
console.log("PASS cross Realm original records allocation restricted provenance");

{
    const r=fresh(), s=createScriptSession();
    const receiver:Value={kind:"number",value:expected};
    const original=failure("TypeError","exact completion",at);
    let captured:OperationContext|null=null, reached=0;
    const abrupt=r.createBuiltin("abrupt",0,(_r,_a,c,_l):ValueCompletion=>{captured=c;reached++;return original;});
    const target:Value={kind:"object",object:abrupt};
    const outer=r.createBuiltin("outer",0,(_r,_a,c,l):ValueCompletion=>{
        const before=s.inspect();const result=c.call(target,receiver,[],l);
        check(result===original,"exact guest completion identity");sameFrame(before,s.inspect());
        check(c===captured,"same canonical context");
        const fn=abrupt.callable;if(fn===null||fn.kind!=="builtin")throw new Error("callable");
        hostFault(()=>{fn.invoke(receiver,[],c,l);},"Script execution unavailable");
        const clone={realm:c.realm,call:c.call,tick:c.tick};
        hostFault(()=>{fn.invoke(receiver,[],clone,l);},"Script execution unavailable");
        return result;
    });
    define(r,"outer",{kind:"object",object:outer});
    const rec=prepare('"use strict";function f(){return outer();}{f();}',r);
    const result=evaluateScript(s,rec);
    check(result.completion===original&&original.diagnostic.loc===at&&reached===1,"root preserves completion/location");idle(s);
}
console.log("PASS exact guest completion location one-use direct replay denial");

// The accepted E3B eighteen setup columns occur after five call-site ticks;
// the defining unit costs nine ticks and is never re-instantiated by a call.
const fdiSource='"use strict";function f(a,b){var a;var x;function g(){}let z;}';
const fdiColumns=[1,1,14,14,16,14,51,40,34,25,27,25,27,34,40,40,40,51,51,51,60,42,51,30,36,42,56];
for(let budget=0;budget<=fdiColumns.length;budget++) {
    const r=fresh(),s=createScriptSession({maxSteps:9+budget,maxCalls:64});
    const rec=prepare(fdiSource,r,"FDI owner");evaluateScript(s,rec);check(s.inspect().steps===9,"FDI seed9");
    const result=evaluateScript(s,prepare('"use strict";f(7);',r,"FDI caller"));
    if(budget<fdiColumns.length) {
        const fault=thrown(result.completion,"RangeError");
        check(fault.diagnostic.loc.column===fdiColumns[budget],"FDI literal prefix "+budget);
        const p=s.inspect().lastAbrupt;
        check(p!==null&&p.unitId===(budget<5?"FDI caller":"FDI owner"),"FDI source switch");
    } else scalar(result.completion,undefined);
    check(rec.inspectMaterializations().completed===(budget>=22?2:1),"FDI nested factory prefix");idle(s);
}
console.log("PASS FDI every eighteen-tick setup prefix with shared source-unit budget");

{
    const r=fresh();
    run('"use strict";function f(){return this;}this.top=this;this.bare=f();this.method=this.f();',r);
    const global=r.globalEnvironment.globalObject;
    const top=own(r,"top"), method=own(r,"method"), bare=own(r,"bare"), f=own(r,"f");
    check(top!==null&&method!==null&&object(top)===global&&object(method)===global&&bare!==null&&bare.kind==="undefined","T01 strict receiver");
    if(f===null)throw new Error("missing f");
    const strict=r.createBuiltin("strict",0,(_receiver,_args,c,l):ValueCompletion=>{
        for(const receiver of [UNDEFINED,{kind:"null"} as Value,{kind:"number",value:expected} as Value,{kind:"object",object:global} as Value]) {
            const result=c.call(f,receiver,[],l);check(result.type==="normal"&&result.value===receiver,"strict exact host Value receiver");
        }
        return normal();
    });
    define(r,"strict",{kind:"object",object:strict});run('"use strict";strict();',r);
}
for(const mode of ["delete","redefine","shadow"]) {
    const r=fresh();const f=value(run('"use strict";function f(){}f;',r));
    check(object(f).getOwnProperty("caller")===undefined&&object(f).getOwnProperty("arguments")===undefined,"fresh no restriction own");
    if(mode==="delete") {
        const deleted=r.functionPrototype.internalDelete("arguments");
        check(deleted.type==="normal"&&deleted.value,"delete configurable endpoint");
        scalar(run('"use strict";f.arguments;',r),undefined);
        scalar(run('"use strict";f.arguments=7;f.arguments;',r),7);
    }else if(mode==="redefine") {
        const updated=r.functionPrototype.defineOwnProperty("arguments",{value:{kind:"number",value:11},writable:true,enumerable:true,configurable:true},hostContext(r),at);
        check(updated.type==="normal"&&updated.value,"redefine endpoint");
        scalar(run('"use strict";f.arguments;',r),11);scalar(run('"use strict";f.arguments=7;f.arguments;',r),7);
    }else {
        const updated=object(f).defineOwnProperty("caller",{value:{kind:"number",value:11},writable:true,enumerable:true,configurable:true},hostContext(r),at);
        check(updated.type==="normal"&&updated.value,"own shadow");scalar(run('"use strict";f.caller;',r),11);
        scalar(run('"use strict";f.caller=7;f.caller;',r),7);
    }
}
console.log("PASS strict this and configurable restricted endpoint mutation neighbors");

for(const mode of ["accessor","coercion","body"]) {
    const r=fresh(),s=createScriptSession(),sentinel=new Error("reachable "+mode);
    let visits=0;
    const fail=r.createBuiltin("fail",0,(_r,_a,_c,_l):ValueCompletion=>{visits++;throw sentinel;});
    const target=new GuestObject(r.objectPrototype);
    if(mode==="accessor")target.bootstrapDefine("x",{get:{kind:"object",object:fail},set:UNDEFINED,enumerable:true,configurable:true});
    if(mode==="coercion")target.bootstrapDefine("valueOf",{value:{kind:"object",object:fail},writable:true,enumerable:true,configurable:true});
    define(r,"target",{kind:"object",object:target});define(r,"fail",{kind:"object",object:fail});
    run('"use strict";function f(){ {'+(mode==="accessor"?'target.x;':mode==="coercion"?'+target;':'fail();')+'} }',r,s);
    const f=own(r,"f");if(f===null)throw new Error("f");
    const outer=r.createBuiltin("outer",0,(_r,_a,c,l):ValueCompletion=>{
        const before=s.inspect();let caught=false;
        try{c.call(f,UNDEFINED,[],l);}catch(error){if(!(error instanceof Error)||error!==sentinel)throw error;caught=true;}
        check(caught,"reachable exact sentinel");sameFrame(before,s.inspect());check(c.realm===r,"host fault canonical projection");return normal();
    });define(r,"outer",{kind:"object",object:outer});run('"use strict";outer();',r,s);
    check(visits===1,"reachable host fault visits");idle(s);
}
{
    const r=fresh(),s=createScriptSession({maxSteps:100000,maxCalls:1000});
    run('"use strict";function f(){return f();}',r,s);const f=own(r,"f");if(f===null)throw new Error("f");
    const outer=r.createBuiltin("outer",0,(_r,_a,c,l):ValueCompletion=>{
        const before=s.inspect();const result=c.call(f,UNDEFINED,[],l);sameFrame(before,s.inspect());
        const fault=thrown(result,"RangeError");check(fault.origin.kind==="resource-limit"&&fault.origin.guardCode==="evaluation-depth"&&fault.origin.count===257,"depth257 restored at nonzero caller");
        return result;
    });define(r,"outer",{kind:"object",object:outer});thrown(run('"use strict";outer();',r,s),"RangeError");idle(s);
}
console.log("PASS reachable accessor coercion body host faults and depth257 cleanup");

{
    const a=fresh(),b=fresh(),s=createScriptSession();
    let canonical:OperationContext|null=null, stages=0;
    const alloc=b.createBuiltin("alloc",0,(_r,_a,c,_l):ValueCompletion=>{
        const snapshot=s.inspect();
        check(snapshot.active!==null&&snapshot.active.realm===b&&snapshot.active.record===ar&&snapshot.active.function!==null,"A07 B allocation A code");
        check(c===canonical,"A07 one canonical context");stages++;
        return normal({kind:"object",object:c.realm.createObject()});
    });define(a,"alloc",{kind:"object",object:alloc});
    const ar=prepare('"use strict";function guest(){return alloc();}guest;',a,"A07 A code");
    const guest=value(evaluateScript(s,ar).completion);
    const enter=b.createBuiltin("enter",0,(_r,_args,c,l):ValueCompletion=>{
        canonical=c;const before=s.inspect();
        const result=c.call(guest,UNDEFINED,[],l);sameFrame(before,s.inspect());
        check(c.realm===b&&object(value(result)).getPrototypeOf()===b.objectPrototype,"A07 B allocation restored B caller");return result;
    });define(b,"enter",{kind:"object",object:enter});
    run('"use strict";enter();',b,s);check(stages===1,"A07 nested stages");idle(s);
}
{
    const r=fresh(),s=createScriptSession();let raw=0;
    const self=r.createBuiltin("self",0,(receiver,args,c,loc):ValueCompletion=>{
        raw++;const fn=self.callable;if(fn===null||fn.kind!=="builtin")throw new Error("self");
        const before=s.inspect();
        hostFault(()=>{fn.invoke(receiver,args,c,loc);},"Script execution unavailable");
        hostFault(()=>{fn.invoke(receiver,args.slice(),c,loc);},"Script execution unavailable");
        hostFault(()=>{fn.invoke(receiver,args,c,{line:loc.line,column:loc.column});},"Script execution unavailable");
        hostFault(()=>{fn.invoke({kind:"undefined"},args,c,loc);},"Script execution unavailable");
        sameFrame(before,s.inspect());check(before.steps===s.inspect().steps,"permit rejection adds no tick");return normal();
    });define(r,"self",{kind:"object",object:self});run('"use strict";self();',r,s);check(raw===1,"consumed permit not replayable");
}
for(const source of [
    '', 'function f(){return this;}', '"use strict";if(false){const x=1;}', '"use strict";function f(){return arguments;}',
    '"use strict";function f(){eval("1");}', '"use strict";let x;var x;', '"use strict";let x;let x;const tail=0;',
    '"use strict";for(let i=0;;){}','"use strict";do{}while(false);break;','"use strict";label: while(true){break label;}',
    '"use strict";switch(1){default:const x=0;}','"use strict";try{}catch(e){}finally{}','"use strict";new f(...xs);','"use strict";class C{}',
    '"use strict";async function f(){}','"use strict";function* f(){}','"use strict";await 1;',
    '"use strict";import x from "x";','"use strict";with(x){}','"use strict";let f=()=>1;',
    '"use strict";let f=function named(){};','"use strict";function f(...x){}','"use strict";function f(x=1){}',
    '"use strict";function f(a,a){}','"use strict";let {x}=o;','"use strict";let o={m(){}};',
    '"use strict";let o={get x(){}};','"use strict";let o={[x]:1};','"use strict";let o={...x};',
    '"use strict";let o={__proto__:null};','"use strict";++x;','"use strict";1,2;'
]) {
    const r=fresh(),s=createScriptSession();const prepared=prepareStrictScript({id:"negative",text:source},r);
    if (source === '"use strict";1,2;') {
        check(prepared.kind === "ready" && s.inspect().steps === 0, "comma prepares without execution");
        scalar(run(source,r,s),2);
        continue;
    }
    if (source === '"use strict";if(false){const x=1;}' || source === '"use strict";switch(1){default:const x=0;}') {
        check(prepared.kind === "ready" && s.inspect().steps === 0, "const prepares without execution");
        check(run(source, r, s).type === "normal", "const executes in branch and switch");
        continue;
    }
    if (source === '"use strict";new f(...xs);') {
        check(prepared.kind === "ready" && s.inspect().steps === 0, "spread constructor prepares");
        check(run('"use strict";function f(){}var xs=[];new f(...xs);',r,s).type === "normal", "spread constructor executes");
        continue;
    }
    if (source === '"use strict";for(let i=0;;){}') {
        check(prepared.kind === "ready" && s.inspect().steps === 0, "lexical for prepares without execution");
        const completion=run(source,r,createScriptSession({maxSteps:100,maxCalls:64}));
        check(completion.type === "throw" && completion.origin.kind === "resource-limit", "lexical for is bounded");
        continue;
    }
    if (source === '"use strict";try{}catch(e){}finally{}') {
        check(prepared.kind === "ready" && s.inspect().steps === 0, "finally prepares without execution");
        check(run(source,r,s).type === "normal", "finally executes");
        continue;
    }
    if (source === '"use strict";let o={m(){}};' || source === '"use strict";let o={get x(){}};') {
        check(prepared.kind === "ready" && s.inspect().steps === 0, "object method prepares without execution");
        check(run(source,r,s).type === "normal", "object method executes");
        scalar(run(source.includes("get x") ? '"use strict";o.x===undefined?1:0;' : '"use strict";o.m()===undefined?1:0;',r,s),1);
        continue;
    }
    if (source === '"use strict";++x;') {
        check(prepared.kind === "ready" && s.inspect().steps === 0, "prefix update prepares without execution");
        thrown(run(source, r, s), "ReferenceError");
        continue;
    }
    check(prepared.kind!=="ready","whole-source rejection "+source);check(s.inspect().steps===0,"no preparation execution");
}
{
    const r=fresh(),s=createScriptSession();
    thrown(run('"use strict";let x=1;throw 7;',r,s),"Uncaught");scalar(run('"use strict";x;',r,s),1);
    const again=evaluateScript(s,prepare('"use strict";let x=1;throw 7;',r));
    check(again.phase==="instantiation","U02 repeat conflicts");thrown(again.completion,"SyntaxError");idle(s);
}
console.log("PASS mixed cross Realm call permit tuple neighbors grammar and retained effects");

for(const guard of ["steps","calls"]) {
    const r=fresh(),s=createScriptSession({maxSteps:guard==="steps"?13:1000,maxCalls:guard==="calls"?1:64});
    run('"use strict";function f(){return 7;}',r,s);check(s.inspect().steps===9,"nested resource seed");
    const f=own(r,"f");if(f===null)throw new Error("f");
    const outer=r.createBuiltin("outer",0,(_r,_a,c,l):ValueCompletion=>{
        const before=s.inspect();check(before.calls===1&&before.depth===2,"nested resource nonzero saved counts");
        const result=c.call(f,UNDEFINED,[],l);sameFrame(before,s.inspect());
        const fault=thrown(result,"RangeError");check(fault.origin.kind==="resource-limit"&&fault.origin.guardCode===guard,"nested resource guard");
        return result;
    });define(r,"outer",{kind:"object",object:outer});thrown(run('"use strict";outer();',r,s),"RangeError");idle(s);
}
{
    const r=fresh();
    run('"use strict";let a;let b;let i=0;while(i<2){let x=i;function f(){return x;}if(i===0){a=f;}else{b=f;}i+=1;}',r);
    scalar(run('"use strict";a();',r),0);scalar(run('"use strict";b();',r),1);
    const different=run('"use strict";a!==b;',r);check(different.type==="normal"&&different.value.kind==="boolean"&&different.value.value,"per-entry distinct closures");
}
{
    const r=fresh();define(r,"fresh",{kind:"number",value:7});r.globalEnvironment.globalObject.preventExtensions();
    scalar(run('"use strict";var fresh;fresh;',r),7);
}
console.log("PASS nested step call restoration closure persistence nonextensible existing global");

for(const item of [
    {source:'"use strict";let a=[1,,3];a.length+(1 in a);',expected:3},
    {source:'"use strict";[1,{toString:function(){return "two";}}].join("-");',expected:"1-two"},
    {source:'"use strict";function f(){return this;}f.call(null);',expected:"null"},
    {source:'"use strict";function f(a){return a;}f.toString();',expected:"function f(a){return a;}"},
    {source:'"use strict";let k={toString:function(){this.n+=1;return "x";},n:0};let o={x:1};o[k]+=(o.x=3);k.n*10+o.x;',expected:14},
    {source:'"use strict";let o={x:1};delete o.x;typeof o.x;',expected:"undefined"},
    {source:'"use strict";let o={valueOf:function(){return 7;}};o+4;',expected:11},
]) {
    const result=run(item.source);
    if(item.expected==="null")check(result.type==="normal"&&result.value.kind==="null","strict Function.call receiver");
    else scalar(result,item.expected);
}
console.log("PASS shared expressions arrays builtin callbacks conversions cached property references");
