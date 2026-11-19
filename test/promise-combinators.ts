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
    const prepared = prepareBoundedScript({ id: "promise-combinators", text }, realm);
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
const cases: { source: string; before: string; after: string }[] = [
    {
        source: "Promise.all([1,Promise.resolve(2),{then(r){r(3)}}]).then(v=>out+=v.join(','))",
        before: "",
        after: "1,2,3",
    },
    { source: "Promise.all([]).then(v=>out+=v.length)", before: "", after: "0" },
    { source: "Promise.all('ab').then(v=>out+=v.join(','))", before: "", after: "a,b" },
    {
        source: "Promise.all([,2]).then(v=>out+=v.length+':'+v.hasOwnProperty('0')+':'+v[0])",
        before: "",
        after: "2:true:undefined",
    },
    {
        source: "var a=Promise.withResolvers(),b=Promise.withResolvers();Promise.all([a.promise,b.promise]).then(v=>out+=v.join(','));b.resolve(2);a.resolve(1)",
        before: "",
        after: "1,2",
    },
    {
        source: "Promise.all([Promise.resolve(1),Promise.reject(4)]).catch(v=>out+=v)",
        before: "",
        after: "4",
    },
    { source: "Promise.race([1,2]).then(v=>out+=v)", before: "", after: "1" },
    { source: "Promise.race([Promise.reject(3),2]).catch(v=>out+=v)", before: "", after: "3" },
    { source: "Promise.race([]).then(()=>out+='wrong',()=>out+='wrong')", before: "", after: "" },
    {
        source: "Promise.race([new Promise(()=>{}),{then(r){r(4)}}]).then(v=>out+=v)",
        before: "",
        after: "4",
    },
    {
        source: "class P extends Promise{}var p=P.all([1,2]);out+=p instanceof P;p.then(v=>out+=':'+v.join(','))",
        before: "true",
        after: "true:1,2",
    },
    {
        source: "class P extends Promise{}var p=P.race([3]);out+=p instanceof P;p.then(v=>out+=v)",
        before: "true",
        after: "true3",
    },
    {
        source: "function C(e){e(v=>out+='R'+v.join(','),v=>out+='J'+v)}C.resolve=v=>({then(r){out+='t';r(v);r(9)}});Promise.all.call(C,[1,2]);out+='e'",
        before: "ttR1,2e",
        after: "ttR1,2e",
    },
    {
        source: "function C(e){e(v=>out+='R'+v,v=>out+='J'+v)}C.resolve=v=>({then(r){r(v);r(v+10)}});Promise.race.call(C,[1,2])",
        before: "R1R11R2R12",
        after: "R1R11R2R12",
    },
    {
        source: "function C(e){e(v=>out+='R'+v.length,()=>{})}C.resolve=()=>{throw 9};Promise.all.call(C,[]);out+='e'",
        before: "R0e",
        after: "R0e",
    },
    {
        source: "function C(e){e(v=>out+='R',()=>{})}C.resolve=()=>{throw 9};Promise.race.call(C,[]);out+='e'",
        before: "e",
        after: "e",
    },
    {
        source: "var resolve=Promise.resolve,count=0;Object.defineProperty(Promise,'resolve',{get(){count++;return function(v){out+=this===Promise;return resolve.call(this,v)}}});Promise.all([1,2]).then(v=>out+=':'+v.join(','));out+=':'+count",
        before: "truetrue:1",
        after: "truetrue:1:1,2",
    },
    {
        source: "function C(e){e(v=>out+=v.join(','),()=>{})}C.resolve=v=>v;Number.prototype.then=function(r){'use strict';r(this+1)};Promise.all.call(C,[1,2])",
        before: "2,3",
        after: "2,3",
    },
];
for (const test of cases) {
    const realm = fresh(),
        session = createScriptSession();
    check(
        run("var out='';" + test.source, realm, session).type === "normal",
        "setup: " + test.source,
    );
    string("out", test.before, realm, session);
    const drained = drainScriptJobs(session);
    check(!drained.fatal && drained.failures.length === 0, "checkpoint: " + test.source);
    string("out", test.after, realm, session);
}
for (const method of ["all", "allSettled", "any", "race"]) {
    const samples: { setup: string; before: string; after: string }[] = [
        {
            setup: "var input={};Object.defineProperty(input,Symbol.iterator,{get(){out+='wrong'}});Object.defineProperty(Promise,'resolve',{get(){out+='r';throw 7}});",
            before: "r",
            after: "r7",
        },
        { setup: "var input={};Promise.resolve=1;", before: "", after: "TypeError" },
        {
            setup: "var input={};input[Symbol.iterator]=()=>{out+='i';throw 7};",
            before: "i",
            after: "i7",
        },
        {
            setup: "var input={};input[Symbol.iterator]=()=>({get next(){out+='n';throw 7},return(){out+='wrong'}});",
            before: "n",
            after: "n7",
        },
        {
            setup: "var input={};input[Symbol.iterator]=()=>({next(){out+='n';throw 7},return(){out+='wrong'}});",
            before: "n",
            after: "n7",
        },
        {
            setup: "var input={};input[Symbol.iterator]=()=>({next(){return {get done(){out+='d';throw 7}}},return(){out+='wrong'}});",
            before: "d",
            after: "d7",
        },
        {
            setup: "var input={};input[Symbol.iterator]=()=>({next(){return {done:false,get value(){out+='v';throw 7}}},return(){out+='wrong'}});",
            before: "v",
            after: "v7",
        },
        {
            setup: "var input={};input[Symbol.iterator]=()=>({next(){return {done:false,value:1}},return(){out+='c';throw 9}});Promise.resolve=()=>{out+='r';throw 7};",
            before: "rc",
            after: "rc7",
        },
        {
            setup: "var input={};input[Symbol.iterator]=()=>({next(){return {done:false,value:1}},get return(){out+='c';throw 9}});Promise.resolve=()=>({get then(){out+='t';throw 7}});",
            before: "tc",
            after: "tc7",
        },
        {
            setup: "var input={};input[Symbol.iterator]=()=>({next(){return {done:false,value:1}},return(){out+='c';return 1}});Promise.resolve=()=>({then:3});",
            before: "c",
            after: "cTypeError",
        },
    ];
    for (const test of samples) {
        const realm = fresh(),
            session = createScriptSession();
        const setup = test.setup;
        check(
            run(
                "var out='';" +
                    setup +
                    "Promise." +
                    method +
                    "(input).catch(e=>out+=e instanceof TypeError?'TypeError':e)",
                realm,
                session,
            ).type === "normal",
            method + " setup " + setup,
        );
        string("out", test.before, realm, session);
        check(drainScriptJobs(session).failures.length === 0, method + " error checkpoint");
        string("out", test.after, realm, session);
    }
    const realm = fresh(),
        session = createScriptSession();
    string(
        "var out='';var input={};input[Symbol.iterator]=()=>{out+='wrong'};try{Promise." +
            method +
            ".call({},input)}catch(e){out+=e instanceof TypeError}out",
        "true",
        realm,
        session,
    );
    string(
        "Promise." + method + ".length+':'+Promise." + method + ".name",
        "1:" + method,
        realm,
        session,
    );
}
{
    const realm = fresh(),
        session = createScriptSession();
    string(
        "var out='',handler;function C(e){e(()=>{},()=>{})}C.resolve=()=>({then(r){handler=r}});Promise.all.call(C,[1]);handler.length+':'+handler.name+':'+handler.hasOwnProperty('prototype')",
        "1::false",
        realm,
        session,
    );
    string(
        "var order='';function D(e){order+='c';e(()=>{},v=>order+='j'+v)}Object.defineProperty(D,'resolve',{get(){order+='r';return ()=>{}}});var input={};input[Symbol.iterator]=()=>{order+='i';throw 7};Promise.all.call(D,input);order",
        "crij7",
        realm,
        session,
    );
}
{
    const realm = fresh(),
        foreign = fresh(),
        session = createScriptSession();
    const constructor = foreign.globalObject.getOwnProperty("Promise");
    if (constructor === undefined || constructor.kind !== "data") {
        throw new Error("foreign constructor");
    }
    realm.defineScriptGlobal("ForeignPromise", { value: constructor.value });
    run("var result;ForeignPromise.all.call(Promise,[1,2]).then(v=>result=v)", realm, session);
    check(drainScriptJobs(session).failures.length === 0, "foreign all checkpoint");
    const result = run("result", realm, session);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === foreign.arrayPrototype,
        "all result array belongs to resolve-element Realm",
    );
}
for (const method of ["all", "allSettled", "any", "race"]) {
    const realm = fresh(),
        session = createScriptSession({ maxSteps: 300, maxCalls: 32 });
    const result = run(
        "var out='',input={};input[Symbol.iterator]=()=>({next(){return {done:false,value:1}},return(){out+='wrong'}});Promise." +
            method +
            "(input)",
        realm,
        session,
    );
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        method + " infinite input bounded",
    );
    check(drainScriptJobs(session).completed === 0, "fatal combinator discards jobs");
    string("out", "", realm, createScriptSession());
}
console.log("Promise combinators passed");
