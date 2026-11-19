import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "promise-helpers", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, text + " expected " + expected);
}
const cases: { source: string; before: string; after: string }[] = [
    { source: "Promise.try(()=>{out+='s';return 3}).then(v=>out+=v)", before: "s", after: "s3" },
    { source: "Promise.try(()=>{throw 4}).catch(v=>out+=v)", before: "", after: "4" },
    { source: "Promise.try(42).catch(e=>out+=e instanceof TypeError);out+='s'", before: "s", after: "strue" },
    { source: "Promise.try().catch(e=>out+=e instanceof TypeError)", before: "", after: "true" },
    { source: "Promise.try(function(a,b){'use strict';out+=(this===undefined)+':'+arguments.length+':';return a+b},2,3).then(v=>out+=v)", before: "true:2:", after: "true:2:5" },
    { source: "Promise.try(()=>({then(r){out+='t';r(7)}})).then(v=>out+=v)", before: "", after: "t7" },
    { source: "var p=Promise.resolve(8);var q=Promise.try(()=>p);out+=q!==p;q.then(v=>out+=v)", before: "true", after: "true8" },
    { source: "class P extends Promise{}var p=P.try(()=>9);out+=p instanceof P;p.then(v=>out+=v)", before: "true", after: "true9" },
    { source: "var c=Promise.withResolvers();c.promise.then(v=>out+=v);c.resolve(2);c.reject(3);c.resolve(4)", before: "", after: "2" },
    { source: "var c=Promise.withResolvers();c.promise.catch(v=>out+=v);c.reject(3);c.resolve(2)", before: "", after: "3" },
    { source: "var c=Promise.withResolvers();c.promise.then(v=>out+=v);c.resolve({then(r){r(4)}})", before: "", after: "4" },
    { source: "class P extends Promise{}var c=P.withResolvers();out+=c.promise instanceof P;c.promise.then(v=>out+=v);c.resolve(5)", before: "true", after: "true5" },
    { source: "function C(e){out+='c';e(v=>out+='r'+v,v=>out+='j'+v)}Promise.try.call(C,()=>{out+='f';return 4})", before: "cfr4", after: "cfr4" },
    { source: "function C(e){out+='c';e(v=>out+='r'+v,v=>out+='j'+v)}Promise.try.call(C,()=>{out+='f';throw 4})", before: "cfj4", after: "cfj4" },
    { source: "function C(e){out+='c';throw 7}try{Promise.try.call(C,()=>out+='wrong')}catch(e){out+=e}", before: "c7", after: "c7" },
    { source: "try{Promise.try.call({},()=>out+='wrong')}catch(e){out+=e instanceof TypeError}", before: "true", after: "true" },
    { source: "function C(e){e(()=>{throw 6},()=>{})}try{Promise.try.call(C,()=>4)}catch(e){out+=e}", before: "6", after: "6" },
    { source: "function C(e){e(()=>{},()=>{throw 6})}try{Promise.try.call(C,()=>{throw 4})}catch(e){out+=e}", before: "6", after: "6" },
    { source: "var p={},r=()=>{},j=()=>{};function C(e){e(r,j);return p}var c=Promise.withResolvers.call(C);out+=(c.promise===p)+':'+(c.resolve===r)+':'+(c.reject===j)", before: "true:true:true", after: "true:true:true" },
    { source: "Promise.try(class {}).catch(e=>out+=e instanceof TypeError)", before: "", after: "true" },
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
    string("var c=Promise.withResolvers();Object.keys(c).join(',')+':'+(Object.getPrototypeOf(c)===Object.prototype)", "promise,resolve,reject:true", realm, session);
    string("var out='';for(var key of Object.keys(c)){var d=Object.getOwnPropertyDescriptor(c,key);out+=d.writable+':'+d.enumerable+':'+d.configurable+';'}out", "true:true:true;true:true:true;true:true:true;", realm, session);
    string("Promise.try.length+':'+Promise.try.name+':'+Promise.withResolvers.length+':'+Promise.withResolvers.name+':'+Object.getOwnPropertyDescriptor(Promise,'try').enumerable", "1:try:0:withResolvers:false", realm, session);
}
for (const source of ["Promise.try.call(null,()=>{})", "Promise.withResolvers.call(null)", "Promise.withResolvers.call(()=>{})", "Promise.withResolvers.call(function(){})"]) {
    const realm = fresh(), session = createScriptSession();
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", "true", realm, session);
}
{
    const realm = fresh(), foreign = fresh(), session = createScriptSession();
    const constructor = foreign.globalObject.getOwnProperty("Promise");
    if (constructor === undefined || constructor.kind !== "data") throw new Error("foreign constructor");
    realm.defineScriptGlobal("ForeignPromise", { value: constructor.value });
    realm.defineScriptGlobal("foreignErrorPrototype", { value: { kind: "object", object: foreign.getErrorPrototype("TypeError") } });
    const result = run("ForeignPromise.withResolvers.call(Promise)", realm, session);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === foreign.objectPrototype, "withResolvers record belongs to method Realm");
    run("var out='';ForeignPromise.try(1).catch(e=>out+=Object.getPrototypeOf(e)===foreignErrorPrototype)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "foreign try drain");
    string("out", "true", realm, session);
}
{
    const realm = fresh(), session = createScriptSession({ maxSteps: 200, maxCalls: 32 });
    const result = run("Promise.try(()=>{while(true){}})", realm, session);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "try callback budget remains fatal");
}
console.log("Promise helpers passed");
