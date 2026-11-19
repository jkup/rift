import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok:boolean,label:string):void {if(!ok)throw new Error(label)}
function fresh():Realm {return new Realm((_line:string)=>{},"script")}
function run(text:string,realm:Realm,session:ScriptSession):ValueCompletion {const p=prepareBoundedScript({id:"async-lexical-conflicts",text},realm);if(p.kind!=="ready")throw new Error("prepare "+text);return evaluateScript(session,p.record).completion}
const sources:string[]=[
  "{function f(){}async function f(){}}",
  "switch(0){case 1:function f(){}default:async function f(){}}",
  "'use strict';{function f(){}async function f(){}}",
  "'use strict';switch(0){case 1:function f(){}default:async function f(){}}",
  "{function f(){}function* f(){}}",
  "switch(0){case 1:function f(){}default:function* f(){}}",
  "'use strict';{function f(){}function* f(){}}",
  "'use strict';switch(0){case 1:function f(){}default:function* f(){}}",
  "{async function f(){}function f(){}}",
  "switch(0){case 1:async function f(){}default:function f(){}}",
  "'use strict';{async function f(){}function f(){}}",
  "'use strict';switch(0){case 1:async function f(){}default:function f(){}}",
  "{async function f(){}async function f(){}}",
  "switch(0){case 1:async function f(){}default:async function f(){}}",
  "'use strict';{async function f(){}async function f(){}}",
  "'use strict';switch(0){case 1:async function f(){}default:async function f(){}}",
  "{async function f(){}function* f(){}}",
  "switch(0){case 1:async function f(){}default:function* f(){}}",
  "'use strict';{async function f(){}function* f(){}}",
  "'use strict';switch(0){case 1:async function f(){}default:function* f(){}}",
  "{function* f(){}function f(){}}",
  "switch(0){case 1:function* f(){}default:function f(){}}",
  "'use strict';{function* f(){}function f(){}}",
  "'use strict';switch(0){case 1:function* f(){}default:function f(){}}",
  "{function* f(){}async function f(){}}",
  "switch(0){case 1:function* f(){}default:async function f(){}}",
  "'use strict';{function* f(){}async function f(){}}",
  "'use strict';switch(0){case 1:function* f(){}default:async function f(){}}",
  "{function* f(){}function* f(){}}",
  "switch(0){case 1:function* f(){}default:function* f(){}}",
  "'use strict';{function* f(){}function* f(){}}",
  "'use strict';switch(0){case 1:function* f(){}default:function* f(){}}",
  "{function f(){}function f(){}async function f(){}}",
  "{async function f(){}function f(){}function f(){}}"
];
for(const text of sources){
 const realm=fresh(),session=createScriptSession();const prepared=prepareBoundedScript({id:"duplicate",text:"var effect=1;"+text},realm);
 check(prepared.kind==="conflict"||(prepared.kind==="blocked"&&prepared.rejection.kind==="syntax-error"),"certified conflict "+text);
 const inert=run("typeof effect",realm,session);check(inert.type==="normal"&&inert.value.kind==="string"&&inert.value.value==="undefined","inert preparation");
 const caught=run("var caught=false;try{eval("+JSON.stringify("var effect=1;"+text)+")}catch(e){caught=e instanceof SyntaxError}caught&&typeof effect==='undefined'",realm,session);
 check(caught.type==="normal"&&caught.value.kind==="boolean"&&caught.value.value,"catchable eval conflict "+text);
}
for(const text of ['{function f(){}function f(){}}','switch(0){case 1:function f(){}default:function f(){}}']){
 const p=prepareBoundedScript({id:"ordinary",text},fresh());check(p.kind==="blocked"&&p.rejection.kind==="unsupported-syntax","ordinary Annex B boundary");
}
{
 const realm=fresh(),session=createScriptSession();const r=run("async function f(){}async function f(){}function* g(){}function* g(){}f() instanceof Promise&&g().next().done",realm,session);check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"var-scoped functions remain permitted");
}
{
 const realm=fresh();const p=prepareBoundedScript({id:"unsupported-tail",text:'{async function f(){}async function f(){}}import x from "x";'},realm);check(p.kind==="blocked"&&p.rejection.kind==="unsupported-syntax","unsupported tail veto");
}
console.log("async lexical conflicts passed");
