import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
    type ScriptSession,
} from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, realm: Realm, session: ScriptSession): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "promise-finally", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === expected,
        text + " expected " + expected,
    );
}
const cases: { source: string; expected: string }[] = [
    { source: "Promise.resolve(3).finally(()=>out+='f').then(v=>out+=v)", expected: "f3" },
    { source: "Promise.reject(4).finally(()=>out+='f').catch(v=>out+=v)", expected: "f4" },
    { source: "Promise.resolve(3).finally(()=>9).then(v=>out+=v)", expected: "3" },
    { source: "Promise.reject(4).finally(()=>9).catch(v=>out+=v)", expected: "4" },
    { source: "Promise.resolve(3).finally(()=>{throw 8}).catch(v=>out+=v)", expected: "8" },
    { source: "Promise.reject(4).finally(()=>{throw 8}).catch(v=>out+=v)", expected: "8" },
    { source: "Promise.resolve(3).finally(()=>Promise.reject(9)).catch(v=>out+=v)", expected: "9" },
    { source: "Promise.reject(4).finally(()=>Promise.reject(9)).catch(v=>out+=v)", expected: "9" },
    {
        source: "Promise.resolve(3).finally(()=>({then(r){out+='t';r(7)}})).then(v=>out+=v)",
        expected: "t3",
    },
    {
        source: "Promise.reject(4).finally(()=>({then(r){out+='t';r(7)}})).catch(v=>out+=v)",
        expected: "t4",
    },
    { source: "Promise.resolve(3).finally({get then(){throw 9}}).then(v=>out+=v)", expected: "3" },
    { source: "Promise.reject(4).finally(null).catch(v=>out+=v)", expected: "4" },
    {
        source: "Promise.resolve(3).finally(function(){'use strict';out+=(this===undefined)+':'+arguments.length+':'}).then(v=>out+=v)",
        expected: "true:0:3",
    },
    {
        source: "Promise.resolve(3).finally(class {}).catch(e=>out+=e instanceof TypeError)",
        expected: "true",
    },
    {
        source: "class P extends Promise{}var p=P.resolve(3);P.resolve=()=>{throw 9};p.finally(()=>2).then(v=>out+=v)",
        expected: "3",
    },
    {
        source: "Promise.resolve(3).finally(()=>({get then(){throw 9}})).catch(v=>out+=v)",
        expected: "9",
    },
    {
        source: "var token={};Promise.reject(token).finally(()=>2).catch(v=>out+=v===token)",
        expected: "true",
    },
];
for (const test of cases) {
    const realm = fresh(),
        session = createScriptSession();
    check(
        run("var out='';" + test.source, realm, session).type === "normal",
        "setup: " + test.source,
    );
    string("out", "", realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 0, "checkpoint: " + test.source);
    string("out", test.expected, realm, session);
}
{
    const realm = fresh(),
        session = createScriptSession();
    string(
        "var order='',o={get constructor(){order+='c';var c={};Object.defineProperty(c,Symbol.species,{get(){order+='s';return Promise}});return c},get then(){order+='t';return function(a,b){order+=(a===7)+':'+(b===7)+':'+(this===o);return 8}}};var result=Promise.prototype.finally.call(o,7);order+':'+result",
        "csttrue:true:true:8",
        realm,
        session,
    );
    string(
        "var handlers;Promise.prototype.finally.call({then(a,b){handlers=[a,b]}},()=>{});handlers[0].length+':'+handlers[1].length+':'+handlers[0].name+':'+handlers[1].name+':'+(handlers[0]!==handlers[1])",
        "1:1:::true",
        realm,
        session,
    );
    string(
        "class P extends Promise{}var p=P.resolve(3);String(p.finally() instanceof P)",
        "true",
        realm,
        session,
    );
    string(
        "Object.getOwnPropertyDescriptor(Promise.prototype,'finally').enumerable+':'+Promise.prototype.finally.length+':'+Promise.prototype.finally.name",
        "false:1:finally",
        realm,
        session,
    );
    check(drainScriptJobs(session).failures.length === 0, "metadata cases checkpoint");
}
for (const source of [
    "Promise.prototype.finally.call(3)",
    "Promise.prototype.finally.call(null)",
    "Promise.prototype.finally.call({constructor:3,then(){throw 9}},null)",
    "var o={constructor:{}};o.constructor[Symbol.species]=()=>{};Promise.prototype.finally.call(o,null)",
]) {
    const realm = fresh(),
        session = createScriptSession();
    string(
        "try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}",
        "true",
        realm,
        session,
    );
}
{
    const realm = fresh(),
        session = createScriptSession();
    run(
        "var out='',resolve;var cleanup=new Promise(r=>resolve=r);Promise.resolve(3).finally(()=>cleanup).then(v=>out+=v)",
        realm,
        session,
    );
    check(drainScriptJobs(session).failures.length === 0, "pending cleanup checkpoint");
    string("out", "", realm, session);
    run("resolve(8)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "resolved cleanup checkpoint");
    string("out", "3", realm, session);
}
{
    const realm = fresh(),
        foreign = fresh(),
        session = createScriptSession();
    const descriptor = foreign.globalObject.getOwnProperty("Promise");
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("foreign Promise");
    }
    realm.defineScriptGlobal("ForeignPromise", { value: descriptor.value });
    string(
        "var o={then(a,b){return a(2)}};var p=ForeignPromise.prototype.finally.call(o,()=>3);String(Object.getPrototypeOf(p)===ForeignPromise.prototype)",
        "true",
        realm,
        session,
    );
    run("var out='';p.then(v=>out+=v)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "foreign cleanup");
    string("out", "2", realm, session);
}
{
    const realm = fresh(),
        session = createScriptSession({ maxSteps: 500, maxCalls: 32 });
    run(
        "var out='';Promise.resolve().finally(()=>{while(true){}}).catch(()=>out+='wrong')",
        realm,
        session,
    );
    check(drainScriptJobs(session).fatal, "cleanup budget remains fatal");
    string("out", "", realm, createScriptSession());
}
console.log("Promise finally passed");
