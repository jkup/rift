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
    "function* f(n){switch(n){case 1:yield \"a\";case 2:yield \"b\";break;default:yield \"d\";}yield \"z\";}Array.from(f(1)).join(\",\")===\"a,b,z\"&&Array.from(f(3)).join(\",\")===\"d,z\";",
    "function* f(n){switch(n){case 1:yield 1;break;default:yield 2;case 3:yield 3;}yield 4;}Array.from(f(0)).join(\",\")===\"2,3,4\"&&Array.from(f(3)).join(\",\")===\"3,4\";",
    "var trace=\"\";function test(n){trace+=n;return n;}function* f(){switch(test(2)){case test(1):yield 1;break;case test(2):yield 2;yield 3;case test(4):yield 4;}}var g=f();g.next();var first=trace;g.next();g.next();first===\"212\"&&trace===\"212\";",
    "function* f(){switch(1){case 1:let x=yield 1;yield ()=>x;case 2:yield x;break;}}var g=f();g.next();var h=g.next(7).value;h()===7&&g.next().value===7&&g.next().done;",
    "function* f(){try{switch(2){case 1:let x=3;case 2:yield x;}}catch(e){yield e instanceof ReferenceError;}}f().next().value===true;",
    "function* f(){switch(1){case 1:yield h();break;case 2:function h(){return 7;}}}f().next().value===7;",
    "function* f(){for(let i=0;i<3;i++){switch(i){case 0:yield 0;break;case 1:yield 1;continue;default:yield 2;}yield 9;}}Array.from(f()).join(\",\")===\"0,9,1,2,9\";",
    "function* f(){switch(1){case 1:try{yield 1;break;}finally{yield 2;}default:yield 3;}yield 4;}Array.from(f()).join(\",\")===\"1,2,4\";",
    "function* f(){outer:{switch(1){case 1:try{yield 1;break outer;}finally{yield 2;}}yield 3;}yield 4;}Array.from(f()).join(\",\")===\"1,2,4\";",
    "function* f(){try{switch(1){case 1:yield 1;return 7;}}finally{yield 2;}}var g=f();g.next();g.next().value===2&&g.next().value===7;",
    "function* f(){switch(0){case 1:yield 1;}switch(0){}yield 2;}Array.from(f()).join(\",\")===\"2\";",
    "var marker={};function* f(){try{switch(1){case 1:yield 1;yield 2;}}catch(e){yield e;}}var g=f();g.next();g.throw(marker).value===marker&&g.next().done;",
    "function* f(){for(const x of [1,2]){switch(x){case 1:yield x;continue;case 2:yield x;break;}yield 9;}}Array.from(f()).join(\",\")===\"1,2,9\";"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"switch case "+i);}
for(const source of ["function* f(){switch(yield 1){case 1:yield 2;}}","function* f(){switch(1){case yield 1:yield 2;}}"]){check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","boundary "+source);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('function* f(){switch(1){case 1:let x=2;yield ()=>++x;case 2:yield x;}}var g=f();',A);define(B,"g",own(A,"g"));
const cross=run('var h=g.next().value;h()===3&&g.next().value===3&&g.next().done;',B);check(cross.type==="normal"&&cross.value.kind==="boolean"&&cross.value.value,"foreign CaseBlock cells");
const conflict=prepareBoundedScript({id:"duplicate-case",text:"function* f(){switch(1){case 1:let x;yield 1;case 2:let x;}}"},new Realm((_line:string):void=>{},"script"));
check(conflict.kind==="conflict"&&conflict.conflict.kind==="duplicate-lexical"&&conflict.diagnostic.phase==="parse","shared CaseBlock lexical conflict");
console.log("generator switch passed");
