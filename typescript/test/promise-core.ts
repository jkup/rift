import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import { type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "promise-core", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, text + " expected " + expected);
}
const cases: { source: string; before: string; after: string }[] = [
    { source: "var out='';new Promise((resolve,reject)=>{out+='e';resolve(3);reject(9);resolve(4);out+='x'}).then(v=>out+=v);out+='s'", before: "exs", after: "exs3" },
    { source: "var out='';Promise.resolve(1).then(v=>{out+='a';return v+1}).then(v=>out+=v);Promise.resolve().then(()=>out+='b')", before: "", after: "ab2" },
    { source: "var out='';Promise.reject(4).then(null, v=>v+1).then(v=>out+=v);Promise.resolve(2).then(1).then(v=>out+=v)", before: "", after: "52" },
    { source: "var out='';Promise.reject(4).then().catch(v=>out+=v)", before: "", after: "4" },
    { source: "var out='';new Promise(()=>{throw 7}).catch(v=>out+=v);Promise.resolve().then(()=>{throw 8}).catch(v=>out+=v)", before: "", after: "78" },
    { source: "var out='';var t={get then(){out+='g';return function(resolve,reject){out+='t';out+=this===t;resolve(5);reject(6);throw 7}}};Promise.resolve(t).then(v=>out+=v);out+='s'", before: "gs", after: "gsttrue5" },
    { source: "var out='';Promise.resolve({get then(){out+='g';throw 8}}).catch(v=>out+=v)", before: "g", after: "g8" },
    { source: "var out='';Promise.resolve({then(resolve,reject){reject(2);resolve(1);throw 3}}).catch(v=>out+=v)", before: "", after: "2" },
    { source: "var out='';Promise.resolve({then(resolve){throw 6}}).catch(v=>out+=v)", before: "", after: "6" },
    { source: "var out='';var obj={then:3};Promise.resolve(obj).then(v=>out+=v===obj)", before: "", after: "true" },
    { source: "var out='',resolve;var p=new Promise(r=>resolve=r);p.catch(e=>out+=e instanceof TypeError);resolve(p)", before: "", after: "true" },
    { source: "var out='';var p=Promise.resolve().then(()=>p);p.catch(e=>out+=e instanceof TypeError)", before: "", after: "true" },
    { source: "var out='';Promise.resolve({then(r){r({then(r){r(9)}})}}).then(v=>out+=v)", before: "", after: "9" },
    { source: "var out='',r;var p=new Promise(resolve=>r=resolve);p.then(v=>out+='a'+v);p.then(v=>out+='b'+v);r(2);p.then(v=>out+='c'+v)", before: "", after: "a2b2c2" },
    { source: "var out='';class P extends Promise{}var p=P.resolve(2);out+=(p instanceof P)+':'+(p.then(v=>v) instanceof P);p.then(v=>out+=v)", before: "true:true", after: "true:true2" },
    { source: "var out='';class P extends Promise {static get [Symbol.species](){return Promise}}var p=P.resolve(2);var q=p.then(v=>v);out+=(q instanceof Promise)+':'+(q instanceof P)", before: "true:false", after: "true:false" },
    { source: "var out='';var p=Promise.resolve(2);p.constructor={};var q=p.then(v=>v);out+=q instanceof Promise", before: "true", after: "true" },
    { source: "var out='';var p=Promise.resolve(2),C={};p.constructor=C;out+=Promise.resolve.call(C,p)===p", before: "true", after: "true" },
    { source: "var out='';var p=Promise.resolve(2);out+=(Promise.resolve(p)===p)+':'+(Promise.reject(p)!==p)", before: "true:true", after: "true:true" },
    { source: "var out='';function C(executor){out+='c';executor(v=>out+='r'+v,v=>out+='j'+v);return {marker:1}}var p=Promise.resolve(3);p.constructor={};p.constructor[Symbol.species]=C;var q=p.then(v=>v+1);out+=q.marker", before: "c1", after: "c1r4" },
    { source: "var out='';function C(executor){executor(undefined,undefined);executor(v=>out+=v,()=>{});}Promise.resolve.call(C,5)", before: "5", after: "5" },
    { source: "var out='';function C(executor){executor(()=>{},()=>{});try{executor(()=>{},()=>{})}catch(e){out+=e instanceof TypeError}}Promise.resolve.call(C,5)", before: "true", after: "true" },
    { source: "var out='';var o={then(a,b){out+=(this===o)+':'+(a===undefined)+':'+b;return 9}};var result=Promise.prototype.catch.call(o,4);out+=':'+result", before: "true:true:4:9", after: "true:true:4:9" },
    { source: "var out='';Promise.resolve(1).then(function(v){'use strict';out+=this===undefined});new Promise(function(r){'use strict';out+=this===undefined;r()})", before: "true", after: "truetrue" },
    { source: "var out='';Promise.resolve(1).then(class {}).catch(e=>out+=e instanceof TypeError)", before: "", after: "true" },
    { source: "var out='';var p=Promise.resolve();Object.defineProperty(p,'constructor',{get(){out+='c';var c={};c[Symbol.species]=function(e){out+='s';e(()=>out+='r',()=>{})};return c}});p.then(()=>out+='h')", before: "cs", after: "cshr" },
    { source: "var out='';var p=Promise.resolve();p.constructor=null;try{p.then()}catch(e){out+=e instanceof TypeError};out+=':'+Object.prototype.toString.call(Promise.prototype)", before: "true:[object Promise]", after: "true:[object Promise]" },
    { source: "var out='';function C(){}var N=C.bind(null);Object.defineProperty(N,'prototype',{get(){out+='p';return null}});try{Reflect.construct(Promise,[1],N)}catch(e){out+=e instanceof TypeError};Reflect.construct(Promise,[r=>out+='e'],N)", before: "truepe", after: "truepe" },
    { source: "var out='';new Promise((r,j)=>{out+=r.length+':'+j.length+':'+r.name+':'+j.name;out+=':'+Object.prototype.hasOwnProperty.call(r,'prototype')});out+=':'+Promise.length+':'+Promise.prototype.then.length+':'+Promise.prototype.catch.length+':'+Promise.resolve.length+':'+Promise.reject.length", before: "1:1:::false:1:2:1:1:1", after: "1:1:::false:1:2:1:1:1" },
    { source: "var out='';Promise.resolve({then(r,j){r({then(r){r(8)}});j(9);throw 10}}).then(v=>out+=v)", before: "", after: "8" },
    { source: "var out='';new Promise((r,j)=>{r(1);throw 2}).then(v=>out+=v);new Promise((r,j)=>{j(3);throw 4}).catch(v=>out+=v)", before: "", after: "13" },
    { source: "var out='',r,j;var p=new Promise((a,b)=>{r=a;j=b});p.then(v=>out+=v);r({get then(){j(2);r(3);return resolve=>resolve(4)}})", before: "", after: "4" },
];
for (let i = 0; i < cases.length; i++) {
    const test = cases[i], realm = fresh(), session = createScriptSession();
    const result = run(test.source, realm, session);
    check(result.type === "normal", "case " + i + " setup");
    string("out", test.before, realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 0, "case " + i + " checkpoint");
    string("out", test.after, realm, session);
    check(drainScriptJobs(session).completed === 0, "drained once");
}
for (const source of ["Promise(()=>{})", "new Promise(1)", "Promise.resolve.call(null,1)", "Promise.reject.call({},1)",
    "Promise.prototype.then.call(Promise.prototype)", "Promise.prototype.then.call({get constructor(){throw 7}})",
    "Promise.resolve.call(function(e){e(1,()=>{})},1)", "var p=Promise.resolve();p.constructor={};p.constructor[Symbol.species]=()=>{};p.then()"] ) {
    const realm = fresh(), session = createScriptSession();
    const result = run("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", realm, session);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === "true", "TypeError: " + source);
}
{
    const realm = fresh(), session = createScriptSession();
    run("var out='',resolve;new Promise(r=>resolve=r).then(v=>out+=v)", realm, session);
    check(drainScriptJobs(session).completed === 0, "pending Promise has no jobs");
    const later = createScriptSession();
    run("resolve(4)", realm, later);
    check(drainScriptJobs(later).failures.length === 0, "stored resolver uses current session");
    string("out", "4", realm, later);
}
{
    const realm = fresh(), session = createScriptSession({ maxSteps: 500, maxCalls: 32 });
    check(run("var t={then(r){r(t)}};Promise.resolve(t)", realm, session).type === "normal", "cycle setup");
    const drained = drainScriptJobs(session);
    check(drained.fatal && drained.failures.length === 1 && drained.failures[0].completion.origin.kind === "resource-limit", "thenable cycles bounded");
    check(drainScriptJobs(session).completed === 0, "cycle queue discarded");
}
{
    const realm = fresh(), session = createScriptSession({ maxSteps: 500, maxCalls: 32 });
    run("var out='';Promise.resolve().then(()=>{while(true){}}).catch(()=>out+='wrong');Promise.resolve().then(()=>out+='later')", realm, session);
    check(drainScriptJobs(session).fatal, "handler budget remains fatal");
    string("out", "", realm, createScriptSession());
}
{
    const realm = fresh(), session = createScriptSession({ maxSteps: 100, maxCalls: 32 });
    const result = run("new Promise(()=>{while(true){}})", realm, session);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "executor budget remains fatal");
}
{
    const realm = fresh(), foreign = fresh(), session = createScriptSession();
    const constructor = foreign.globalObject.getOwnProperty("Promise");
    if (constructor === undefined || constructor.kind !== "data") throw new Error("foreign Promise missing");
    realm.defineScriptGlobal("ForeignPromise", { value: constructor.value });
    realm.defineScriptGlobal("foreignTypeError", { value: { kind: "object", object: foreign.getErrorPrototype("TypeError") } });
    run("var out='',resolve;var p=new ForeignPromise(r=>resolve=r);p.catch(e=>out+=Object.getPrototypeOf(e)===foreignTypeError);resolve(p)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "foreign resolving function");
    string("out", "true", realm, session);
    string("var q=ForeignPromise.resolve(1);q.constructor=undefined;String(Object.getPrototypeOf(q.then())===ForeignPromise.prototype)", "true", realm, session);
    string("var local=Promise.resolve(2);local.constructor=undefined;String(Object.getPrototypeOf(ForeignPromise.prototype.then.call(local))===ForeignPromise.prototype)", "true", realm, session);
    string("function C(){}var bound=C.bind(null);bound.prototype=0;String(Object.getPrototypeOf(Reflect.construct(ForeignPromise,[()=>{}],bound))===Promise.prototype)", "true", realm, session);
    const handler = run("(function(v){return []})", foreign, session);
    if (handler.type !== "normal") throw new Error("foreign handler setup");
    realm.defineScriptGlobal("handler", { value: handler.value });
    run("var result;Promise.resolve().then(handler).then(v=>result=v)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "foreign handler drain");
    const result = run("result", realm, session);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === foreign.arrayPrototype, "handler Realm");
}
{
    const realm = fresh(), session = createScriptSession();
    run("var out='';function C(e){e(()=>{throw 7},()=>{})}var p=Promise.resolve(1);p.constructor={};p.constructor[Symbol.species]=C;p.then();Promise.resolve().then(()=>out+='next')", realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 1 && drained.failures[0].completion.value.kind === "number" && drained.failures[0].completion.value.value === 7, "custom resolving function throws are job failures");
    string("out", "next", realm, session);
}
console.log("Promise core passed");

