import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs, type ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm: Realm, session: ScriptSession, id = "async-await"): ValueCompletion {
    const prepared = prepareBoundedScript({ id, text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(session, prepared.record).completion;
}
function string(text: string, expected: string, realm: Realm, session: ScriptSession): void {
    const result = run(text, realm, session);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, text + " expected " + expected);
}
const cases: {source:string;before:string;after:string}[] = [
    {
        "source": "async function f(){out+=\"a\";var x=await 7;out+=\"b\";return x;}f().then(v=>out+=v);out+=\"s\"",
        "before": "as",
        "after": "asb7"
    },
    {
        "source": "async function f(){return await Promise.resolve(7);}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "s7"
    },
    {
        "source": "async function f(){try{await Promise.reject(7);}catch(e){out+=\"c\";return e;}}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "sc7"
    },
    {
        "source": "async function f(){await Promise.reject(7);out+=\"wrong\";}f().catch(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "s7"
    },
    {
        "source": "async function f(){return (await 3)+(await 4);}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "s7"
    },
    {
        "source": "async function f(){return -(await 7);}f().then(v=>out+=v);",
        "before": "",
        "after": "-7"
    },
    {
        "source": "async function f(){return (await false)?await 1:await 7;}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(){return await await 7;}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "s7"
    },
    {
        "source": "async function f(){let [x]=await [7];return x;}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "var x=1;async function f(){x+=await 6;return x;}f().then(v=>out+=v);out+=x;",
        "before": "1",
        "after": "17"
    },
    {
        "source": "async function f(){try{throw await 7;}catch(e){return e;}}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(){if(await true)return 7;return 8;}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "async function f(){var n=0;while(await (n<2)){out+=n++;}return n;}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "s012"
    },
    {
        "source": "async function f(){var n=0;do{out+=n++;}while(await (n<2));return n;}f().then(v=>out+=v);out+=\"s\"",
        "before": "0s",
        "after": "0s12"
    },
    {
        "source": "async function f(){try{return await 7;}finally{out+=\"f\";await 1;out+=\"g\";}}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "sfg7"
    },
    {
        "source": "async function f(){try{return 7;}finally{await Promise.reject(8);}}f().catch(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "s8"
    },
    {
        "source": "async function f(){try{await Promise.reject(7);}catch(e){return await (e+1);}finally{await 1;out+=\"f\";}}f().then(v=>out+=v);",
        "before": "",
        "after": "f8"
    },
    {
        "source": "async function f(){return await {then(r){out+=\"t\";r(7);r(8);}};}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "st7"
    },
    {
        "source": "var p=Promise.resolve(7);p.then=function(){out+=\"wrong\";};async function f(){return await p;}f().then(v=>out+=v);",
        "before": "",
        "after": "7"
    },
    {
        "source": "var p=Promise.resolve(7);Object.defineProperty(Promise,Symbol.species,{get(){throw 8;}});async function f(){out+=await p;}f();out+=\"s\"",
        "before": "s",
        "after": "7"
    },
    {
        "source": "var p=Promise.resolve(7);Object.defineProperty(p,\"constructor\",{get(){throw 8;}});async function f(){try{await p;}catch(e){out+=e;return 9;}}f().then(v=>out+=v);out+=\"s\"",
        "before": "8s",
        "after": "8s9"
    },
    {
        "source": "var C=Promise;Promise=function(){throw 9;};async function f(){out+=await 7;}f();out+=\"s\"",
        "before": "s",
        "after": "7"
    },
    {
        "source": "async function f(){return false&&(await 7);}f().then(v=>out+=v);out+=\"s\"",
        "before": "s",
        "after": "sfalse"
    },
    {
        "source": "async function f(){try{await missing;}catch(e){out+=e instanceof ReferenceError;}return 7;}f().then(v=>out+=v);out+=\"s\"",
        "before": "trues",
        "after": "trues7"
    },
    {
        "source": "async function f(){out+=\"a\";await 1;out+=\"b\";}f();Promise.resolve().then(()=>out+=\"p\");out+=\"s\"",
        "before": "as",
        "after": "asbp"
    },
    {
        "source": "var C=(async function(){}).constructor;C(\"return await 7;\")().then(v=>out+=v);",
        "before": "",
        "after": "7"
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
for(const text of ['await 1;','function f(){await 1;}','async function f(){await;}','async function f(x=await 1){}','async function f(){return await 1**2;}','async function f(){return ()=>await 1;}'])
 check(prepareBoundedScript({id:"boundary",text},fresh()).kind === "blocked","await boundary "+text);
{
 const A=fresh(),B=fresh(),creator=createScriptSession();
 run('var c=Promise.withResolvers(),out="";async function f(){var x=await c.promise;out+=x;return x+1;}var p=f();',A,creator);
 for(const name of ['c','p']){const property=A.globalObject.getOwnProperty(name);if(property===undefined||property.kind!=="data")throw Error(name);B.defineScriptGlobal(name,{value:property.value});}
 const before=creator.inspect().steps,session=createScriptSession();
 run('var out="";p.then(v=>out+=v);c.resolve(7);',B,session);string('out','',A,creator);
 const steps=creator.inspect().steps,drained=drainScriptJobs(session);
 check(!drained.fatal&&drained.failures.length===0,"foreign await drain");
 check(creator.inspect().steps===steps&&session.inspect().steps>0,"await current session");
 string('out','7',A,creator);string('out','8',B,session);
 const state=session.inspect();check(state.active===null&&state.calls===0&&state.depth===0,"await caller restored");
}
{
 const realm=fresh(),session=createScriptSession({maxSteps:200,maxCalls:16});
 run('var cleaned=false;async function f(){try{await 1;while(true){}}finally{cleaned=true;}}f();',realm,session);
 const drained=drainScriptJobs(session);
 check(drained.fatal&&drained.failures.length===1&&drained.failures[0].completion.origin.kind==="resource-limit","await fatal budget");
 string('String(cleaned)','false',realm,createScriptSession());
}
{
 const owner=fresh(),caller=fresh(),creator=createScriptSession();
 run('async function f(){await 1;}',owner,creator,'await-owner');
 const property=owner.globalObject.getOwnProperty('f');if(property===undefined||property.kind!=="data")throw new Error("owner function");
 caller.defineScriptGlobal('f',{value:property.value});
 const measured=createScriptSession();check(run('f();',caller,measured,'await-caller').type==="normal","measure await call");
 const limited=createScriptSession({maxSteps:measured.inspect().steps,maxCalls:64});
 check(run('f();',caller,limited,'await-caller').type==="normal","await queues within budget");
 const failed=drainScriptJobs(limited);
 check(failed.fatal&&failed.completed===0&&failed.failures.length===1,"await job start budget");
 check(failed.failures[0].source.unitId==='await-owner'&&failed.failures[0].source.realm===owner,"await job retains suspension source");
 check(!drainScriptJobs(measured).fatal,"independent await job");
}
{
 const source="async function f(){return foo(await 1);}",realm=fresh(),session=createScriptSession();
 check(prepareBoundedScript({id:"historical-call",text:source},realm).kind==="ready","historical async call admitted");
 check(run('var out="";function foo(x){return x}'+source+';f().then(x=>out+=x)',realm,session).type==="normal","historical async call setup");
 const jobs=drainScriptJobs(session);check(!jobs.fatal&&jobs.failures.length===0,"historical async call jobs");string('out','1',realm,session);
}
console.log("async await passed");
