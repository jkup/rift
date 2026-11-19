import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, steps = 100000, realm = new Realm((_line: string) => {}, "script")) {
    const prepared = prepareBoundedScript({ id: "array-pattern", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function expect(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for(const text of [
  "var a,b,sum=0;for([a,b] of [[1,2],[3,4]]){sum+=a+b}a===3&&b===4&&sum===10",
  "var a,b;for([a,b=a+1] of [[3]]){}a===3&&b===4",
  "var a,rest;for([a,...rest] of [[1,2,3]]){}a===1&&rest.join(',')==='2,3'",
  "var a,b;for([[a],b] of [[[1],2]]){}a===1&&b===2",
  "var a;var out='';for([a] in {ab:1,cd:2}){out+=a}out==='ac'&&a==='c'",
  "var a;var values=[];for([a] of [[1],[2]])values.push(()=>a);values[0]()===2&&values[1]()===2",
  "var o={};for([o.x] of [[7]]){}o.x===7",
  "var calls=0;function target(){calls++;return {}}for([target().x] of []){}calls===0",
  "var f;for([f=function(){}] of [[]]){}f.name==='f'",
  "var n=0;for([] of [[],[]]){n++}n===2",
  "function f(){for([arguments[0]] of [[7]]){}return arguments[0]}f(1)===7",
  "var sum=0,a;outer:for([a] of [[1],[2],[3]]){if(a===2)continue outer;sum+=a}sum===4",
  "var closed=0;var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,value:[1]}},return(){closed++;return {}}}};const a=0;var ok=false;try{for([a] of xs){}}catch(e){ok=e instanceof TypeError}ok&&closed===1",
  "var log='';var o={};var key={toString(){log+='k';return 'x'}};function target(){log+='t';return o}var inner={};inner[Symbol.iterator]=function(){log+='i';return {next(){log+='n';return {done:false,get value(){log+='v';return 7}}},return(){log+='r';return {}}}};for([target()[key]] of [inner]){}o.x===7&&log==='itnvkr'",
  "var log='';var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,value:[]}},return(){log+='o';return {}}}};function fail(){throw 7}var a;var ok=false;try{for([a=fail()] of xs){}}catch(e){ok=e===7}ok&&log==='o'"
]) expect(text);
for(const text of ["for(([a]) of []){}","for([1] of []){}","for([...a,] of []){}","for([a]=[] of []){}","for([o?.x] of []){}","'use strict';for([eval] of []){}"])
    check(prepareBoundedScript({id:'invalid-array-loop',text},new Realm((_line:string)=>{},'script')).kind!=='ready','reject '+text);
check(parse('for([a] of []){}').error!==null,'legacy loop boundary');
console.log('For assignment patterns passed');
