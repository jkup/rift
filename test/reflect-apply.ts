import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function run(realm: Realm, text: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "reflect-apply", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    if (session.inspect().active !== null || session.inspect().calls !== 0) {
        throw new Error("Reflect apply restoration");
    }
    return result;
}
for (const text of [
    "(()=>{function f(a,b){return this.x+a+b}return Reflect.apply(f,{x:1},[2,3])===6})()",
    '(()=>{function f(){"use strict";return this}return Reflect.apply(f,undefined,[])===undefined&&Reflect.apply(f,null,[])===null&&Reflect.apply(f,7,[])===7})()',
    "(()=>{var reads=0,args={get length(){reads++;throw 1}};try{Reflect.apply({},null,args)}catch(e){return e instanceof TypeError&&reads===0}return false})()",
    '(()=>{function f(){}return [undefined,null,true,1,1n,"x",Symbol()].every(args=>{try{Reflect.apply(f,null,args)}catch(e){return e instanceof TypeError}return false})})()',
    '(()=>{var log="",args={get length(){log+="L";return 2},get 0(){log+="0";return 3},get 1(){log+="1";return 4}};function f(a,b){log+="F";return a+b}return Reflect.apply(f,null,args)===7&&log==="L01F"})()',
    "(()=>{var called=false,marker={},args={length:2,get 0(){throw marker},get 1(){throw 2}};try{Reflect.apply(()=>{called=true},null,args)}catch(e){return e===marker&&!called}return false})()",
    "(()=>{var args=Object.create({0:7});args.length=2;return Reflect.apply(function(a,b){return a===7&&b===undefined&&arguments.length===2},null,args)})()",
    "(()=>{var args={length:2,get 0(){this[1]=8;this.length=0;return 7}};return Reflect.apply((a,b)=>a===7&&b===8,null,args)})()",
    "(()=>{function f(){return arguments.length}return Reflect.apply(f,null,{length:-1})===0&&Reflect.apply(f,null,{length:2.9})===2&&Reflect.apply(f,null,{})===0})()",
    '(()=>{var log="",args={length:{valueOf(){log+="L";return 1}},get 0(){log+="0";return 7}};return Reflect.apply(x=>x,null,args)===7&&log==="L0"})()',
    "(()=>{var read=false,args={length:1n,get 0(){read=true;return 1}};try{Reflect.apply(()=>0,null,args)}catch(e){return e instanceof TypeError&&!read}return false})()",
    "(()=>{var read=false,args={length:1,0:7,get [Symbol.iterator](){read=true;throw 1}};return Reflect.apply(x=>x,null,args)===7&&!read})()",
    '(()=>{function f(x){return x}Object.defineProperty(f,"apply",{get(){throw 1}});return Reflect.apply(f,null,[7])===7})()',
    "(()=>{function f(a,b){return this.x+a+b}return Reflect.apply(f.bind({x:1},2),{x:9},[3])===6})()",
    "(()=>{var reads=0,args={get length(){reads++;return 0}};class C{}try{Reflect.apply(C,null,args)}catch(e){return e instanceof TypeError&&reads===1}return false})()",
    "(()=>{var ran=false;function* f(x){ran=true;yield x}var i=Reflect.apply(f,null,[7]);return !ran&&i.next().value===7&&ran})()",
    "(()=>{var marker={};function f(){throw marker}try{Reflect.apply(f,null,[])}catch(e){return e===marker}return false})()",
    '(()=>{function f(){"use strict";var a=()=>this;return Reflect.apply(a,{x:1},[])}return f()===undefined})()',
    '(()=>{return Reflect.apply.length===3&&Reflect.apply.name==="apply"})()',
    "function f(){return arguments.length}f.apply(null)===0&&f.apply(null,null)===0&&f.apply(null,undefined)===0",
    "var a={length:2,0:3,1:4};function C(x,y){this.sum=x+y}Reflect.construct(C,a).sum===7",
    "var bad=false;try{new Reflect.apply(()=>1,null,[])}catch(e){bad=e instanceof TypeError}bad",
    'var d=Object.getOwnPropertyDescriptor(Reflect,"apply");d.writable&&!d.enumerable&&d.configurable',
    'function f(){return arguments.length}Reflect.apply(f,undefined,new String("ab"))===2',
    "function f(){return Reflect.apply((a,b)=>a+b,null,arguments)}f(3,4)===7",
]) {
    const result = run(new Realm((_line: string) => {}, "script"), text);
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("execute: " + text);
    }
}

const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const method = run(owner, "Reflect.apply");
if (method.type !== "normal") {
    throw new Error("Reflect apply export");
}
caller.defineScriptGlobal("apply", { value: method.value });
for (const text of ["apply(null,null,[])", "apply(()=>1,null,null)"]) {
    const error = run(caller, text);
    if (
        error.type !== "throw" ||
        error.value.kind !== "object" ||
        error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")
    ) {
        throw new Error("Reflect apply error Realm");
    }
}
const target = run(owner, '(function(){throw new TypeError("owner")})');
if (target.type !== "normal") {
    throw new Error("Reflect target export");
}
caller.defineScriptGlobal("target", { value: target.value });
const foreign = run(caller, "Reflect.apply(target,null,[])");
if (
    foreign.type !== "throw" ||
    foreign.value.kind !== "object" ||
    foreign.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")
) {
    throw new Error("Reflect target error Realm");
}
const local = run(caller, 'apply(()=>0,null,{get length(){throw new TypeError("caller")}})');
if (
    local.type !== "throw" ||
    local.value.kind !== "object" ||
    local.value.object.getPrototypeOf() !== caller.getErrorPrototype("TypeError")
) {
    throw new Error("Reflect list error Realm");
}
const receiver = run(
    caller,
    "var receiver={};apply(function(){return this},receiver,[])===receiver",
);
if (receiver.type !== "normal" || receiver.value.kind !== "boolean" || !receiver.value.value) {
    throw new Error("Reflect foreign receiver");
}

const realm = new Realm((_line: string) => {}, "script"),
    session = createScriptSession();
const asyncScript = prepareBoundedScript(
    {
        id: "reflect-async",
        text: "var result=false;Reflect.apply(async function(x){return await x},null,[7]).then(x=>result=x===7)",
    },
    realm,
);
if (
    asyncScript.kind !== "ready" ||
    evaluateScript(session, asyncScript.record).completion.type !== "normal"
) {
    throw new Error("Reflect async start");
}
const jobs = drainScriptJobs(session);
if (jobs.fatal || jobs.failures.length !== 0) {
    throw new Error("Reflect async jobs");
}
const asyncResult = run(realm, "result");
if (
    asyncResult.type !== "normal" ||
    asyncResult.value.kind !== "boolean" ||
    !asyncResult.value.value
) {
    throw new Error("Reflect async result");
}

for (const expression of [
    "Reflect.apply(target,null,list)",
    "target.apply(null,list)",
    "Reflect.construct(target,list)",
]) {
    let interrupted = false,
        completed = false;
    for (let steps = 0; steps < 100; steps++) {
        const budgetRealm = new Realm((_line: string) => {}, "script");
        const setup = run(
            budgetRealm,
            "var called=false,list={length:8};function target(){called=true;return 7}",
        );
        if (setup.type !== "normal") {
            throw new Error("Reflect budget setup");
        }
        const result = run(budgetRealm, expression, steps);
        if (result.type === "throw") {
            if (result.origin.kind !== "resource-limit" || result.origin.guardCode !== "steps") {
                throw new Error("Reflect budget cutoff");
            }
            interrupted = true;
        } else {
            const called = run(budgetRealm, "called");
            if (
                called.type !== "normal" ||
                called.value.kind !== "boolean" ||
                !called.value.value
            ) {
                throw new Error("Reflect budget invocation");
            }
            completed = true;
        }
    }
    if (!interrupted || !completed) {
        throw new Error("Reflect budget boundary");
    }
    const huge = run(
        new Realm((_line: string) => {}, "script"),
        expression
            .replaceAll("target", "(function(){})")
            .replaceAll("list", "{length:9007199254740991}"),
        100,
    );
    if (
        huge.type !== "throw" ||
        huge.origin.kind !== "resource-limit" ||
        huge.origin.guardCode !== "steps"
    ) {
        throw new Error("Reflect huge list bounded");
    }
}
console.log("reflect apply passed");
