import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "promise-settlement", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, text + " expected " + expected);
}
const cases: { source: string; before: string; after: string }[] = [
    { source: "Promise.allSettled([1,Promise.reject(2),Promise.resolve(3)]).then(v=>out+=v.map(x=>x.status+':'+(x.status==='fulfilled'?x.value:x.reason)).join(','))", before: "", after: 'fulfilled:1,rejected:2,fulfilled:3' },
    { source: "Promise.allSettled([]).then(v=>out+=v.length)", before: "", after: "0" },
    { source: "var a=Promise.withResolvers(),b=Promise.withResolvers();Promise.allSettled([a.promise,b.promise]).then(v=>out+=v[0].value+':'+v[1].reason);b.reject(2);a.resolve(1)", before: "", after: "1:2" },
    { source: "var token={};Promise.allSettled([Promise.reject(token)]).then(v=>out+=(v[0].reason===token)+':'+v[0].hasOwnProperty('value'))", before: "", after: "true:false" },
    { source: "Promise.any([Promise.reject(1),2,Promise.resolve(3)]).then(v=>out+=v)", before: "", after: "2" },
    { source: "Promise.any([Promise.reject(1),Promise.reject(2)]).catch(e=>out+=(e instanceof AggregateError)+':'+e.errors.join(','))", before: "", after: "true:1,2" },
    { source: "Promise.any([]).catch(e=>out+=(e instanceof AggregateError)+':'+e.errors.length)", before: "", after: "true:0" },
    { source: "var a=Promise.withResolvers(),b=Promise.withResolvers();Promise.any([a.promise,b.promise]).catch(e=>out+=e.errors.join(','));b.reject(2);a.reject(1)", before: "", after: "1,2" },
    { source: "Promise.any([new Promise(()=>{}),Promise.reject(1)]).then(()=>out+='wrong',()=>out+='wrong')", before: "", after: "" },
    { source: "Promise.allSettled([new Promise(()=>{}),Promise.reject(1)]).then(()=>out+='wrong')", before: "", after: "" },
    { source: "class P extends Promise{}var p=P.any([1]);out+=p instanceof P;p.then(v=>out+=v)", before: "true", after: "true1" },
    { source: "class P extends Promise{}var p=P.allSettled([1]);out+=p instanceof P;p.then(v=>out+=v[0].value)", before: "true", after: "true1" },
    { source: "function C(e){e(v=>out+=v.map(x=>x.status+':'+(x.status==='fulfilled'?x.value:x.reason)).join(','),e=>out+='wrong')}C.resolve=v=>({then(r,j){r(v);j(9);r(10)}});Promise.allSettled.call(C,[1,2])", before: 'fulfilled:1,fulfilled:2', after: 'fulfilled:1,fulfilled:2' },
    { source: "function C(e){e(v=>out+=v.map(x=>x.status+':'+(x.status==='fulfilled'?x.value:x.reason)).join(','),e=>out+='wrong')}C.resolve=v=>({then(r,j){j(v);r(9);j(10)}});Promise.allSettled.call(C,[1,2])", before: 'rejected:1,rejected:2', after: 'rejected:1,rejected:2' },
    { source: "function C(e){e(v=>out+='wrong',e=>out+=e.errors.join(','))}C.resolve=v=>({then(r,j){j(v);j(9)}});Promise.any.call(C,[1,2])", before: "1,2", after: "1,2" },
    { source: "function C(e){e(v=>out+='r'+v,e=>out+='j'+e.errors.join(','))}C.resolve=v=>({then(r,j){r(v);j(v)}});Promise.any.call(C,[1,2])", before: "r1r2j1,2", after: "r1r2j1,2" },
    { source: "var A=AggregateError;AggregateError=()=>{out+='wrong'};Promise.any([Promise.reject(2)]).catch(e=>out+=(e instanceof A)+':'+e.errors[0])", before: "", after: "true:2" },
];
for (const test of cases) {
    const realm = fresh(), session = createScriptSession();
    check(run("var out='';" + test.source, realm, session).type === "normal", "setup: " + test.source);
    string("out", test.before, realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 0, "checkpoint: " + test.source);
    string("out", test.after, realm, session);
}
{
    const realm = fresh(), session = createScriptSession();
    string("var count=0;function C(e){e(()=>{},()=>{count++;throw 7})}C.resolve=Promise.resolve;var caught;try{Promise.any.call(C,[])}catch(e){caught=e}count+':'+caught", "1:7", realm, session);
    string("var count=0;function D(e){e(()=>{},()=>{count++;throw 8})}D.resolve=v=>({then(r,j){j(v)}});var caught;try{Promise.any.call(D,[1,2])}catch(e){caught=e}count+':'+caught", "1:8", realm, session);
    run("var records,aggregate;Promise.allSettled([1,Promise.reject(2)]).then(v=>records=v);Promise.any([]).catch(e=>aggregate=e)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "descriptors checkpoint");
    string("Object.keys(records[0]).join(',')+':'+Object.keys(records[1]).join(',')", "status,value:status,reason", realm, session);
    string("var out='';for(var r of records){for(var key of Object.keys(r)){var d=Object.getOwnPropertyDescriptor(r,key);out+=d.writable+':'+d.enumerable+':'+d.configurable+';'}}out", "true:true:true;true:true:true;true:true:true;true:true:true;", realm, session);
    string("var d=Object.getOwnPropertyDescriptor(aggregate,'errors');d.writable+':'+d.enumerable+':'+d.configurable+':'+Error.isError(aggregate)", "true:false:true:true", realm, session);
}
{
    const realm = fresh(), foreign = fresh(), session = createScriptSession();
    const constructor = foreign.globalObject.getOwnProperty("Promise");
    if (constructor === undefined || constructor.kind !== "data") throw new Error("foreign Promise");
    realm.defineScriptGlobal("ForeignPromise", { value: constructor.value });
    realm.defineScriptGlobal("foreignObjectPrototype", { value: { kind: "object", object: foreign.objectPrototype } });
    realm.defineScriptGlobal("foreignArrayPrototype", { value: { kind: "object", object: foreign.arrayPrototype } });
    realm.defineScriptGlobal("foreignAggregatePrototype", { value: { kind: "object", object: foreign.getErrorPrototype("AggregateError") } });
    run("var records,error,empty;ForeignPromise.allSettled.call(Promise,[1]).then(v=>records=v);ForeignPromise.any.call(Promise,[Promise.reject(2)]).catch(e=>error=e);ForeignPromise.any.call(Promise,[]).catch(e=>empty=e)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "foreign aggregation checkpoint");
    string("String(Object.getPrototypeOf(records)===foreignArrayPrototype)+':'+(Object.getPrototypeOf(records[0])===foreignObjectPrototype)", "true:true", realm, session);
    string("String(Object.getPrototypeOf(error)===foreignAggregatePrototype)+':'+(Object.getPrototypeOf(error.errors)===foreignArrayPrototype)+':'+(Object.getPrototypeOf(empty)===foreignAggregatePrototype)", "true:true:true", realm, session);
}
console.log("Promise settlement passed");
