import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript, type ScriptSession } from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(source: string, realm: Realm, session: ScriptSession = createScriptSession()): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + ": " + source);
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") throw new Error("missing " + name);
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases: string[] = [
    "function* f(){outer:{yield 1;break outer;yield 2;}yield 3;}Array.from(f()).join(\",\")===\"1,3\";",
    "function* f(){var i=0;outer:while(i<3){i++;yield i;continue outer;}yield 9;}Array.from(f()).join(\",\")===\"1,2,3,9\";",
    "function* f(){a:b:for(let i=0;i<3;i++){yield i;if(i===0)continue a;if(i===1)break b;}yield 9;}Array.from(f()).join(\",\")===\"0,1,9\";",
    "function* f(){outer:for(let i=0;i<2;i++){for(let j=0;j<3;j++){yield i*10+j;continue outer;}}yield 9;}Array.from(f()).join(\",\")===\"0,10,9\";",
    "function* f(){outer:{try{yield 1;break outer;}finally{yield 2;}}yield 3;}Array.from(f()).join(\",\")===\"1,2,3\";",
    "function* f(){outer:for(let i=0;i<2;i++){try{yield i;continue outer;}finally{yield i+10;}}yield 9;}Array.from(f()).join(\",\")===\"0,10,1,11,9\";",
    "var trace=\"\";function it(name){return {next(){return {value:1,done:false};},return(){trace+=name;return {};},[Symbol.iterator](){return this;}};}function* f(){outer:for(const x of it(\"A\")){for(const y of it(\"B\")){yield 1;break outer;}}yield trace;}var g=f();g.next();g.next().value===\"BA\";",
    "var trace=\"\";function it(name){return {next(){return {value:1,done:false};},return(){trace+=name;return {};},[Symbol.iterator](){return this;}};}function* f(){outer:for(let i=0;i<2;i++){for(const x of it(\"B\")){yield i;continue outer;}}yield trace;}Array.from(f()).join(\",\")===\"0,1,BB\";",
    "var closed=0,n=0,it={next(){return {value:++n,done:n>2};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){outer:for(const x of it){yield x;continue outer;}}Array.from(f()).join(\",\")===\"1,2\"&&closed===0;",
    "function* f(){outer:for(const k in {a:1,b:2}){yield k;continue outer;}yield \"z\";}Array.from(f()).join(\",\")===\"a,b,z\";",
    "function* f(){outer:for(let i=0;i<2;i++){try{yield i;break outer;}finally{yield i+10;continue outer;}}yield 9;}Array.from(f()).join(\",\")===\"0,10,1,11,9\";",
    "function* f(){outer:{try{yield 1;return 7;}finally{yield 2;break outer;}}return 9;}var g=f();g.next();g.next().value===2&&g.next().value===9;"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"label case "+i);}
for(const source of ["function* f(){label:{yield 1;continue label;}}","function* f(){while(true){yield 1;continue missing;}}","function* f(){a:a:while(true)yield 1;}"]){check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","boundary "+source);}
console.log("generator labels passed");
