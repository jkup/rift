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
const cases: {source:string;before:string;after:string}[] = [
    {
        "source": "async function f(){out+=\"b\";return 7;}f().then(v=>out+=v);out+=\"s\"",
        "before": "bs",
        "after": "bs7"
    },
    {
        "source": "async function f(){throw 7;}try{f().catch(v=>out+=v);out+=\"s\";}catch(e){out+=\"wrong\";}",
        "before": "s",
        "after": "s7"
    },
    {
        "source": "async function f(){}f().then(v=>out+=v===undefined);",
        "before": "",
        "after": "true"
    },
    {
        "source": "async function f(){return;}f().then(v=>out+=v===undefined);",
        "before": "",
        "after": "true"
    },
    {
        "source": "function fail(){throw 7;}async function f(a=fail()){out+=\"wrong\";}f().catch(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "s7"
    },
    {
        "source": "async function f([x]){out+=\"wrong\";}f(null).catch(e=>out+=e instanceof TypeError);out+=\"s\"",
        "before": "s",
        "after": "strue"
    },
    {
        "source": "async function f(a=b,b=7){out+=\"wrong\";}f().catch(e=>out+=e instanceof ReferenceError);",
        "before": "",
        "after": "true"
    },
    {
        "source": "async function f({x=7}={}){return x;}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(a){arguments[0]=7;return a;}f(1).then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(a){\"use strict\";arguments[0]=7;return a;}f(1).then(v=>out+=v);",
        "before": "",
        "after": "1"
    },
    {
        "source": "async function f(){return this;}f().then(v=>out+=v===globalThis);",
        "before": "",
        "after": "true"
    },
    {
        "source": "async function f(){\"use strict\";return this;}f().then(v=>out+=v===undefined);",
        "before": "",
        "after": "true"
    },
    {
        "source": "async function f(){return new.target;}f().then(v=>out+=v===undefined);",
        "before": "",
        "after": "true"
    },
    {
        "source": "var f=async function named(){return named===f;};f().then(v=>out+=v);out+=f.name;",
        "before": "named",
        "after": "namedtrue"
    },
    {
        "source": "var f=async function(){return 7;};out+=f.name;f().then(v=>out+=v);",
        "before": "f",
        "after": "f7"
    },
    {
        "source": "async function f(){return {then(r){out+=\"t\";r(7);}};}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "st7"
    },
    {
        "source": "var marker={};async function f(){return {get then(){out+=\"g\";throw marker;}};}f().catch(e=>out+=e===marker);out+=\"s\"",
        "before": "gs",
        "after": "gstrue"
    },
    {
        "source": "var p=Promise.resolve(7);async function f(){return p;}var q=f();out+=q!==p;q.then(v=>out+=v);",
        "before": "true",
        "after": "true7"
    },
    {
        "source": "async function f(){try{return 7;}finally{out+=\"f\";}}f().then(v=>out+=v);",
        "before": "f",
        "after": "f7"
    },
    {
        "source": "async function f(){try{throw 7;}catch(e){return e+1;}}f().then(v=>out+=v);",
        "before": "",
        "after": "8"
    },
    {
        "source": "async function f(){try{return 7;}finally{throw 8;}}f().catch(v=>out+=v);",
        "before": "",
        "after": "8"
    },
    {
        "source": "var saved=Promise;Promise=function(){throw 8;};async function f(){return 7;}var p=f();out+=p instanceof saved;p.then(v=>out+=v);",
        "before": "true",
        "after": "true7"
    },
    {
        "source": "Promise.resolve=function(){throw 8;};async function f(){return 7;}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(a,b=1){}out+=f.length+\":\"+f.name+\":\"+Object.hasOwn(f,\"prototype\");try{new f();}catch(e){out+=\":\"+(e instanceof TypeError);}",
        "before": "1:f:false:true",
        "after": "1:f:false:true"
    },
    {
        "source": "async function f(){}var p=Object.getPrototypeOf(f),C=p.constructor;out+=(Object.getPrototypeOf(p)===Function.prototype)+\":\"+(Object.getPrototypeOf(C)===Function)+\":\"+Object.prototype.toString.call(f)+\":\"+C.name+\":\"+C.length;",
        "before": "true:true:[object AsyncFunction]:AsyncFunction:1",
        "after": "true:true:[object AsyncFunction]:AsyncFunction:1"
    },
    {
        "source": "var C=(async function(){}).constructor;var f=C(\"a\",\"return a+1;\");out+=f.name+\":\"+f.length+\":\";f(6).then(v=>out+=v);",
        "before": "anonymous:1:",
        "after": "anonymous:1:7"
    },
    {
        "source": "var C=(async function(){}).constructor;var f=new C(\"return 7;\");f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "var x=7;function make(){let x=8;return (async function(){}).constructor(\"return x;\");}make()().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "{async function hidden(){return 7;}hidden().then(v=>out+=v);}out+=typeof hidden;",
        "before": "undefined",
        "after": "undefined7"
    },
    {
        "source": "var f;{async function named(){return 7;}f=named;}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(){return 7;}f.bind(null)().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(){await 1;}f().then(v=>out+=v===undefined);",
        "before": "",
        "after": "true"
    },
    {
        "source": "var o={async f(){}};o.f().then(v=>out+=v===undefined);",
        "before": "",
        "after": "true"
    }
];
for(const test of cases){
 const realm=fresh(),session=createScriptSession();
 check(run("var out='';"+test.source,realm,session).type === "normal","setup: "+test.source);
 string("out",test.before,realm,session);
 const drained=drainScriptJobs(session);
 check(!drained.fatal&&drained.failures.length===0,"checkpoint: "+test.source);
 string("out",test.after,realm,session);
}
for(const text of ['async function* f(){}','var f=async()=>7;','if(true) async function f(){}','label: async function f(){}','async\nfunction f(){}'])
 check(prepareBoundedScript({id:"boundary",text},fresh()).kind === "blocked","async boundary "+text);
{
 const realm=fresh(),session=createScriptSession({maxSteps:100,maxCalls:16});
 const result=run('async function f(){while(true){}}f();',realm,session);
 check(result.type === "throw"&&result.origin.kind === "resource-limit","async fatal body");
}
{
 const realm=fresh(),session=createScriptSession({maxSteps:100,maxCalls:16});
 const result=run('function costly(){while(true){}}async function f(x=costly()){}f();',realm,session);
 check(result.type === "throw"&&result.origin.kind === "resource-limit","async fatal setup");
}
{
 const A=fresh(),B=fresh(),creator=createScriptSession();run('async function f(x){return x+1;}async function fail([x]){}',A,creator);
 for(const name of ['f','fail']){const p=A.globalObject.getOwnProperty(name);if(p===undefined||p.kind!=="data")throw Error(name);B.defineScriptGlobal(name,{value:p.value});}
 const before=creator.inspect().steps,session=createScriptSession();
 const p=run('var out="";var p=f(6);p.then(v=>out+=v);fail(null).catch(e=>out+=Object.getPrototypeOf(e)===foreignTypeError);p;',B,session);
 check(p.type === "normal"&&p.value.kind === "object"&&p.value.object.getPrototypeOf()===A.promisePrototype,"async Promise Realm");
 B.defineScriptGlobal('foreignTypeError',{value:{kind:"object",object:A.getErrorPrototype("TypeError")}});
 const drained=drainScriptJobs(session);check(!drained.fatal&&drained.failures.length===0,"foreign async jobs");string('out','7true',B,session);
 check(creator.inspect().steps===before&&session.inspect().steps>0,"async current session");
 const state=session.inspect();check(state.active===null&&state.calls===0&&state.depth===0,"async caller restored");
}
console.log("async function passed");
