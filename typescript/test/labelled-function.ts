import type { ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
import { parseDeclarationPlan } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, drainScriptJobs } from "../src/script-execution.js";
const cases: {id:string;text:string;expected:string}[] = [
  {
    "id": "global",
    "text": "console.log(f()); label:function f(){return 7;}console.log(f());",
    "expected": "7\n7\n"
  },
  {
    "id": "nested",
    "text": "a:b:function f(){return 8;}console.log(f());",
    "expected": "8\n"
  },
  {
    "id": "local",
    "text": "function g(){console.log(f());a:function f(){return 3;}return f;}console.log(g()());",
    "expected": "3\n3\n"
  },
  {
    "id": "block",
    "text": "console.log(typeof f);{console.log(f());a:function f(){return 4;}}console.log(f());",
    "expected": "undefined\n4\n4\n"
  },
  {
    "id": "block-skipped",
    "text": "if(false){a:function f(){return 1;}}console.log(typeof f);",
    "expected": "undefined\n"
  },
  {
    "id": "veto",
    "text": "let f=2;{a:function f(){return 4;}console.log(f());}console.log(f);",
    "expected": "4\n2\n"
  },
  {
    "id": "source",
    "text": "a:function f( x ){return x;}console.log(f.toString());",
    "expected": "function f( x ){return x;}\n"
  },
  {
    "id": "own-strict",
    "text": "a:function f(){\"use strict\";return this;}console.log(f()===undefined);",
    "expected": "true\n"
  },
  {
    "id": "loop-block",
    "text": "var a=[];for(let i=0;i<2;i++){l:function f(){return i;}a.push(f);}console.log(a[0](),a[1]());",
    "expected": "0 1\n"
  },
  {
    "id": "generator",
    "text": "function* g(){a:function f(){return 6;}yield f();}console.log(g().next().value);",
    "expected": "6\n"
  },
  {
    "id": "async",
    "text": "async function g(){a:function f(){return 7;}return f();}g().then(x=>console.log(x));",
    "expected": "7\n"
  },
  {
    "id": "parameter",
    "text": "function g(f){{a:function f(){return 9;}console.log(f());}console.log(f);}g(2);",
    "expected": "9\n2\n"
  },
  {
    "id": "duplicates",
    "text": "a:function f(){return 1;}b:function f(){return 2;}console.log(f());",
    "expected": "2\n"
  },
  {
    "id": "break-copy",
    "text": "{breakLabel:{break breakLabel;a:function f(){return 9;}}}console.log(typeof f);",
    "expected": "undefined\n"
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
  "\"use strict\";a:function f(){}",
  "function g(){\"use strict\";a:function f(){}}",
  "class C{m(){a:function f(){}}}",
  "a:function* f(){}",
  "a:async function f(){}",
  "if(true)a:function f(){}",
  "if(false);else a:b:function f(){}",
  "while(false)a:function f(){}",
  "for(;;)a:function f(){}",
  "do a:function f(){}while(false);",
  "let f;a:function f(){}",
  "a:a:function f(){}"
];
for(const text of invalid){
 const result=prepareBoundedScript({id:"invalid",text},new Realm((_line:string)=>{},"script"));
 if(result.kind==="ready"||!("diagnostic" in result)||result.diagnostic.name!=="SyntaxError"||result.diagnostic.phase!=="parse")throw new Error("invalid accepted: "+text);
}


function run(source:string,realm:Realm,session:ScriptSession):ValueCompletion {
 const prepared=prepareBoundedScript({id:"labelled-lifetime",text:source},realm);
 if(prepared.kind!=="ready")throw new Error("labelled lifetime preparation");
 const result=evaluateScript(session,prepared.record).completion;
 const state=session.inspect();
 if(state.active!==null||state.calls!==0||state.depth!==0)throw new Error("labelled session cleanup");
 return result;
}
const owner=new Realm((_line:string)=>{},"script"),caller=new Realm((_line:string)=>{},"script");
const creator=createScriptSession();
if(run("a:function make(){return [];}b:function slow(){while(true){}}",owner,creator).type!=="normal")throw new Error("labelled lifetime setup");
for(const name of ["make","slow"]){
 const property=owner.globalObject.getOwnProperty(name);
 if(property===undefined||property.kind!=="data")throw new Error("labelled lifetime global");
 caller.defineScriptGlobal(name,{value:property.value});
}
const before=creator.inspect().steps;
const result=run("make()",caller,createScriptSession());
if(result.type!=="normal"||result.value.kind!=="object"||result.value.object.getPrototypeOf()!==owner.arrayPrototype)throw new Error("labelled defining Realm");
const stopped=run("slow()",caller,createScriptSession({maxSteps:100,maxCalls:16}));
if(stopped.type!=="throw"||stopped.origin.kind!=="resource-limit")throw new Error("labelled caller budget");
if(creator.inspect().steps!==before)throw new Error("labelled retained creator session");
for(const budget of [0,10,50,200]){
 const stopped=run("while(true){a:function f(){return 1;}f();}",new Realm((_line:string)=>{},"script"),createScriptSession({maxSteps:budget,maxCalls:16}));
 if(stopped.type!=="throw"||stopped.origin.kind!=="resource-limit")throw new Error("labelled resource bound");
}
const source="a:b:function f( x ){return x;}";
const plan=parseDeclarationPlan({id:"labelled-plan",text:source});
if(plan.kind!=="complete")throw new Error("labelled plan incomplete");
const fn=plan.functions[0],decl=plan.declarations[0];
if(plan.scopes.length!==2||fn.start!==4||fn.end!==source.length||decl.scope!==0||plan.scopes[fn.scope].parent!==0)throw new Error("labelled source ownership");
if(plan.scopes[0].varNames.join(",")!=="f"||plan.scopes[0].lexicalNames.length!==0)throw new Error("labelled global hoisting");
console.log("labelled functions passed");
