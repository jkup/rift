import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { parseDeclarationPlan } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
const cases: {id:string;text:string;expected:string}[] = [
  {
    "id": "true",
    "text": "console.log(typeof f);if(true)function f(){return 7;}console.log(f());",
    "expected": "undefined\n7\n"
  },
  {
    "id": "false",
    "text": "if(false)function f(){return 7;}console.log(typeof f);",
    "expected": "undefined\n"
  },
  {
    "id": "else",
    "text": "if(false);else function f(){return 8;}console.log(f());",
    "expected": "8\n"
  },
  {
    "id": "both",
    "text": "if(false)function f(){return 1;}else function f(){return 2;}console.log(f());",
    "expected": "2\n"
  },
  {
    "id": "lexical-veto",
    "text": "let f=9;if(true)function f(){return 7;}console.log(f);",
    "expected": "9\n"
  },
  {
    "id": "parameter-veto",
    "text": "function outer(f){if(true)function f(){}return typeof f;}console.log(outer(3));",
    "expected": "number\n"
  },
  {
    "id": "source",
    "text": "if(true)function f( a ){ return a; }console.log(f.toString());",
    "expected": "function f( a ){ return a; }\n"
  },
  {
    "id": "loop-closures",
    "text": "var out=[];for(let i=0;i<3;i++){if(true)function f(){return i;}out.push(f);}console.log(out.map(f=>f()).join(\",\"));",
    "expected": "0,1,2\n"
  },
  {
    "id": "generator",
    "text": "function* g(){if(yield 1)function f(){return 7;}return f();}var it=g();console.log(it.next().value,it.next(true).value);",
    "expected": "1 7\n"
  },
  {
    "id": "async",
    "text": "async function g(){if(await true)function f(){return 8;}return f();}g().then(v=>console.log(v));",
    "expected": "8\n"
  },
  {
    "id": "strict-function-body",
    "text": "if(true)function f(){\"use strict\";return this;}console.log(f()===undefined);",
    "expected": "true\n"
  },
  {
    "id": "condition-before-copy",
    "text": "var f=3;if((console.log(f),true))function f(){return 9;}console.log(f());",
    "expected": "3\n9\n"
  },
  {
    "id": "dangling-else",
    "text": "if(true)if(false)function f(){return 1;}else function f(){return 2;}console.log(f());",
    "expected": "2\n"
  },
  {
    "id": "function-local",
    "text": "function outer(){console.log(typeof f);if(true)function f(){return 4;}return f();}console.log(outer(),typeof f);",
    "expected": "undefined\n4 undefined\n"
  },
  {
    "id": "block-lexical-veto",
    "text": "let f=1;{if(true)function f(){return 2;}}console.log(f);",
    "expected": "1\n"
  }
];
for(const item of cases){
 let output="";const realm=new Realm((line:string)=>{output+=line+"\n";},"script");
 const prepared=prepareBoundedScript({id:item.id,text:item.text},realm);
 if(prepared.kind!=="ready")throw new Error("prepare "+item.id);
 const session=createScriptSession();const result=evaluateScript(session,prepared.record).completion;
 if(result.type!=="normal")throw new Error("execute "+item.id);
 const jobs=drainScriptJobs(session);if(jobs.fatal||jobs.failures.length!==0)throw new Error("jobs "+item.id);
 if(output!==item.expected)throw new Error("output "+item.id+": "+output);
}
const invalid=[
  "\"use strict\";if(true)function f(){}",
  "function g(){\"use strict\";if(true)function f(){}}",
  "class C{m(){if(true)function f(){}}}",
  "if(true)function* f(){}",
  "if(true)async function f(){}",
  "while(false)function f(){}",
  "if(true)label:function f(){}"
];
for(const text of invalid){
 const result=prepareBoundedScript({id:"invalid",text},new Realm((_line:string)=>{},"script"));
 if(result.kind==="ready"||!("diagnostic" in result)||result.diagnostic.name!=="SyntaxError"||result.diagnostic.phase!=="parse")throw new Error("invalid accepted: "+text);
}


function run(source:string,realm:Realm,session:ScriptSession):ValueCompletion {
 const prepared=prepareBoundedScript({id:"conditional-lifetime",text:source},realm);
 if(prepared.kind!=="ready")throw new Error("conditional lifetime preparation");
 const result=evaluateScript(session,prepared.record).completion;
 const state=session.inspect();
 if(state.active!==null||state.calls!==0||state.depth!==0)throw new Error("conditional session cleanup");
 return result;
}
const owner=new Realm((_line:string)=>{},"script"),caller=new Realm((_line:string)=>{},"script");
const creator=createScriptSession();
if(run("if(true)function make(){return [];}if(true)function slow(){while(true){}}",owner,creator).type!=="normal")throw new Error("conditional lifetime setup");
for(const name of ["make","slow"]){
 const property=owner.globalObject.getOwnProperty(name);
 if(property===undefined||property.kind!=="data")throw new Error("conditional lifetime global");
 caller.defineScriptGlobal(name,{value:property.value});
}
const before=creator.inspect().steps;
const result=run("make()",caller,createScriptSession());
if(result.type!=="normal"||result.value.kind!=="object"||result.value.object.getPrototypeOf()!==owner.arrayPrototype)throw new Error("conditional defining Realm");
const stopped=run("slow()",caller,createScriptSession({maxSteps:100,maxCalls:16}));
if(stopped.type!=="throw"||stopped.origin.kind!=="resource-limit")throw new Error("conditional caller budget");
if(creator.inspect().steps!==before)throw new Error("conditional retained creator session");
for(const budget of [0,10,50,200]){
 const stopped=run("while(true){if(true)function f(){return 1;}f();}",new Realm((_line:string)=>{},"script"),createScriptSession({maxSteps:budget,maxCalls:16}));
 if(stopped.type!=="throw"||stopped.origin.kind!=="resource-limit")throw new Error("conditional resource bound");
}
const source="if(true)function f( a ){ return a; }";
const plan=parseDeclarationPlan({id:"conditional-plan",text:source});
if(plan.kind!=="complete")throw new Error("conditional plan incomplete");
const block=plan.scopes[1];
if(block.kind!=="block"||block.strict||block.lexicalNames.join(",")!=="f"||block.start!==8||block.end!==source.length)throw new Error("conditional block source");
const fn=plan.functions[0];
if(fn.start!==block.start||fn.end!==block.end||plan.scopes[fn.scope].parent!==block.id)throw new Error("conditional function scope");
if(plan.legacyBlockFunctions?.length!==1)throw new Error("conditional legacy copy");
console.log("conditional functions passed");
