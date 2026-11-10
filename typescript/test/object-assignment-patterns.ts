import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { auditBoundedScriptNumericAssignments, auditBoundedScriptLexicalStatements, auditBoundedScriptNumericSeparators, parse } from "../src/parser.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, steps = 100000, realm = new Realm((_line: string) => {}, "script")) {
    const prepared = prepareBoundedScript({ id: "object-assignment", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function expect(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
  "var a,b;var input={a:1,b:2};({a,b}=input)===input&&a===1&&b===2",
  "var a,b;({x:a,y:b=7}={x:1});a===1&&b===7",
  "var a,b;({a=3,b=a+1}={});a===3&&b===4",
  "var a,b;({a,b=7}={a:null,b:null});a===null&&b===null",
  "var a,b;({x:{a},y:[b]}={x:{a:1},y:[2]});a===1&&b===2",
  "var a;[{a}]=[{a:7}];a===7",
  "var a,rest;({a,...rest}={a:1,b:2});a===1&&rest.b===2&&!Object.hasOwn(rest,'a')",
  "var s=Symbol(),t=Symbol();var input={a:1};input[s]=2;input[t]=3;var a,rest;({[s]:a,...rest}=input);a===2&&!Object.hasOwn(rest,s)&&rest[t]===3",
  "var f;({f=function(){}}={});f.name==='f'",
  "var f;({x:(f)=function(){}}={});f.name===''",
  "var a;({length:a}='abc');a===3",
  "var x;({a:x,b:x}={a:1,b:2});x===2",
  "var o={};var key={toString(){return 'old'}};var source={get a(){key.toString=function(){return 'new'};return 7}};({a:o[key]}=source);o.new===7&&o.old===undefined",
  "var log='';var target={};function select(){log+='k';return 'a'}function ref(){log+='t';return target}function init(){log+='d';return 7}var input={get a(){log+='v';return undefined}};({[select()]:ref().x=init()}=input);target.x===7&&log==='ktvd'",
  "var o={};var input={a:1};({...o.rest}=input);o.rest.a===1&&o.rest!==input",
  "var input={};Object.defineProperty(input,'__proto__',{value:7,enumerable:true});var a,rest;({__proto__:a,...rest}=input);a===7&&!Object.hasOwn(rest,'__proto__')",
  "var hit=false;function key(){hit=true;return 'a'}var a,ok=false;try{({[key()]:a}=null)}catch(e){ok=e instanceof TypeError}ok&&!hit",
  "var a;var sum=0;for({a} of [{a:1},{a:2}]){sum+=a}sum===3&&a===2"
]) expect(text);
for (const text of [
  "({a=1});",
  "var result={a};",
  "({[key]:1});",
  "({...x});",
  "({a=1},7);",
  "({a=1}).x=2;",
  "({a})=x;",
  "({get a(){}}=x);",
  "({a(){}}=x);",
  "({...a,b}=x);",
  "({...a,}=x);",
  "({...{a}}=x);",
  "({a:o?.x}=x);",
  "'use strict';({eval}=x);"
]) {
    if (text === "({[key]:1});" || text === "var result={a};") {
        const completion = run(text);
        check(completion.type === "throw" && completion.diagnostic.name === "ReferenceError", "object property now reads the unbound identifier");
    } else check(prepareBoundedScript({id:"invalid-object",text},new Realm((_line:string)=>{},"script")).kind!=="ready", "reject "+text);
}


for (const text of [
    "({}=1)===1",
    "var ok=false;try{({}=null)}catch(e){ok=e instanceof TypeError}ok",
    "var n,sum=0;for({length:n} in {ab:1,cde:2}){sum+=n}sum===5",
    "const x=0;var hits=0,ok=false;try{({x}={get x(){hits++;return 1}})}catch(e){ok=e instanceof TypeError}hits===1&&ok",
    "var a,b;({get:a,set:b}={get:1,set:2});a===1&&b===2",
    "var a;({x:{a}={a:7}}={});a===7",
    "var a;({[(1,'a')]:a}={a:7});a===7",
    "var a,b;({__proto__:a,__proto__:b}=Object.create({}));a===b",
    "var x;Object.defineProperty(Number.prototype,'x',{get:function(){'use strict';return typeof this}});({x}=1);x==='number'",
    "var rest;var hits=0;Object.defineProperty(Object.prototype,'x',{set:function(v){hits++},configurable:true});({...rest}={x:7});hits===0&&rest.x===7",
    "var rest;var input={get a(){delete input.b;input.c=3;return 1},b:2};({...rest}=input);rest.a===1&&!Object.hasOwn(rest,'b')&&!Object.hasOwn(rest,'c')",
    "var log='';var out={};function target(){log+='t';return out}var input={get a(){log+='g';return 7}};({...target().x}=input);log==='tg'&&out.x.a===7",
    "var a=0,rest=7,ok=false;var input={a:1,get b(){throw 9}};try{({a,...rest}=input)}catch(e){ok=e===9}ok&&a===1&&rest===7",
    "var closed=0;var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,value:null}},return(){closed++;return {}}}};var ok=false;try{[{}]=xs}catch(e){ok=e instanceof TypeError}ok&&closed===1",
    "var a;function f(){({[arguments[0]]:a=()=>arguments[1]}={});return a()}f('x',7)===7"
]) expect(text);
for (const text of ["({[a,b]:x}=o);", "({a=1,b:o.x}=({c=2}));", "({a:({b=1}).x}=o);", "({a(){return {b=1}}});", "1=2;({x=1});", "if(false)let a;({x=1});", "'use strict';var eval;({x=1});"])
    check(prepareBoundedScript({id:"invalid-cover",text},new Realm((_line:string)=>{},"script")).kind!=="ready", "reject "+text);
check(parse("var a;({a}=o);").error!==null,"legacy assignment boundary");
const owner=new Realm((_line:string)=>{},"script"),caller=new Realm((_line:string)=>{},"script");
const foreign=run("function f(input){var rest;({...rest}=input);return rest}f",100000,owner);
if(foreign.type!=="normal")throw new Error("foreign setup");
caller.defineScriptGlobal("foreign",{value:foreign.value});
const rest=run("foreign({a:1})",100000,caller);
check(rest.type==="normal"&&rest.value.kind==="object"&&rest.value.object.getPrototypeOf()===owner.objectPrototype,"rest defining Realm");
const error=run("foreign(null)",100000,caller);
check(error.type==="throw"&&error.value.kind==="object"&&error.value.object.getPrototypeOf()===owner.getErrorPrototype("TypeError"),"error defining Realm");
const limitedRealm=new Realm((_line:string)=>{},"script");
run("var input={};for(var i=0;i<100;i++){input[i]=i}var rest,caught=false",100000,limitedRealm);
const limited=run("try{({...rest}=input)}catch(e){caught=true}",100,limitedRealm);
check(limited.type==="throw"&&limited.origin.kind==="resource-limit","rest copy budget");
const caught=run("caught",100000,limitedRealm);
check(caught.type==="normal"&&caught.value.kind==="boolean"&&!caught.value.value,"fatal limits bypass catch");
for (const text of ["1=2;({x=1});", "if(false)let a;({x=1});", "0x_F;({x=1});"]) {
    const prepared=prepareBoundedScript({id:"cover-veto",text},new Realm((_line:string)=>{},"script"));
    check(prepared.kind==="blocked"&&prepared.rejection.kind==="unsupported-syntax","unconsumed cover vetoes certification: "+text);
}
check(auditBoundedScriptNumericAssignments("1=2;({x=1});").kind==="blocked","numeric audit cover veto");
check(auditBoundedScriptLexicalStatements("if(false)let a;({x=1});").kind==="blocked","lexical audit cover veto");
check(auditBoundedScriptNumericSeparators("0x_F;({x=1});").kind==="blocked","separator audit cover veto");
console.log("Object assignment patterns passed");
