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
const cases:{source:string;before:string;after:string}[]=[
  {
    "source": "var f=async x=>await x;f(7).then(v=>out+=v);out+=\"s\"",
    "before": "s",
    "after": "s7"
  },
  {
    "source": "var f=async (x,y=2)=>x+y;f(5).then(v=>out+=v);out+=\"s\"",
    "before": "s",
    "after": "s7"
  },
  {
    "source": "var f=async ()=>{out+=\"a\";await 1;out+=\"b\";return 7};f().then(v=>out+=v);out+=\"s\"",
    "before": "as",
    "after": "asb7"
  },
  {
    "source": "var f=async ({x},[y],...r)=>{return await x+y+r[0]};f({x:1},[2],4).then(v=>out+=v)",
    "before": "",
    "after": "7"
  },
  {
    "source": "function f(x){return async y=>{await 1;return this.x+arguments[0]+y}}var g=f.call({x:2},3);g.call({x:100},2).then(v=>out+=v)",
    "before": "",
    "after": "7"
  },
  {
    "source": "class A{m(){return this.x}}class B extends A{constructor(){super();this.x=7}f(){return async ()=>{await 1;return super.m()}}}new B().f()().then(v=>out+=v)",
    "before": "",
    "after": "7"
  },
  {
    "source": "function F(){this.f=async ()=>{await 1;return new.target}}var o=new F();o.f().then(v=>out+=v===F)",
    "before": "",
    "after": "true"
  },
  {
    "source": "var f=async x=>x;out+=f.name+\":\"+f.length+\":\"+f.hasOwnProperty(\"prototype\");try{new f()}catch(e){out+=\":\"+(e instanceof TypeError)}out+=\":\"+(Object.getPrototypeOf(f)===Object.getPrototypeOf(async function(){}))",
    "before": "f:1:false:true:true",
    "after": "f:1:false:true:true"
  },
  {
    "source": "var f=async (x=missing)=>x;f().catch(e=>out+=e instanceof ReferenceError);out+=\"s\"",
    "before": "s",
    "after": "strue"
  },
  {
    "source": "var f=async ()=>{throw 7};f().catch(e=>out+=e);out+=\"s\"",
    "before": "s",
    "after": "s7"
  },
  {
    "source": "var f=async ()=>async x=>await x;f().then(g=>g(7)).then(v=>out+=v)",
    "before": "",
    "after": "7"
  },
  {
    "source": "var f=async ()=>{var g=()=>3;return await g()};f().then(v=>out+=v)",
    "before": "",
    "after": "3"
  },
  {
    "source": "function* g(){yield 1;var f=async ()=>await 7;yield f()}var i=g();out+=i.next().value;i.next().value.then(v=>out+=v)",
    "before": "1",
    "after": "17"
  },
  {
    "source": "var f=async ()=>{for await(let x of [1,2])out+=x};f()",
    "before": "",
    "after": "12"
  },
  {
    "source": "var f=async (x)=>({x});f(7).then(o=>out+=o.x)",
    "before": "",
    "after": "7"
  },
  {
    "source": "function async(){out+=arguments.length;return arguments[0]}var a=async(7),b=async(),c=async(...[1,2],3);out+=\":\"+a+\":\"+b+\":\"+c",
    "before": "103:7:undefined:1",
    "after": "103:7:undefined:1"
  },
  {
    "source": "var f=async=>async+1;out+=f(6)",
    "before": "7",
    "after": "7"
  },
  {
    "source": "var f=async /* c */ (x) => x;out+=f.toString()===\"async /* c */ (x) => x\"",
    "before": "true",
    "after": "true"
  }
];
for(const test of cases){const realm=fresh(),session=createScriptSession();check(run("var out='';"+test.source,realm,session).type==="normal","setup "+test.source);string("out",test.before,realm,session);const drained=drainScriptJobs(session);check(!drained.fatal&&drained.failures.length===0,"jobs "+test.source);string("out",test.after,realm,session);}
for(const text of ['var f=async (x,x)=>x','var f=async (x=await 1)=>x','var f=async (...x,y)=>x','var f=async (...x,)=>x','var f=async (x)\n=>x','var f=async ()=>()=>await 1','var f=async ()=>foo(await 1)'])check(prepareBoundedScript({id:"boundary",text},fresh()).kind==="blocked","async arrow boundary "+text);
{
 const realm=fresh(),session=createScriptSession();check(run('var async=7;var f=async\nx=>x;var out=String(f);',realm,session).type==="normal","async newline ASI");string('out','7',realm,session);
}
console.log("async arrow passed");
