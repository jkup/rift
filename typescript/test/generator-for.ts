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
"function* f(){for(;;){try{yield 1;}finally{}}}var g=f();g.next();g.return();g.next().done;",
    "function* f(){for(let i=0;i<3;i++){yield ()=>i;}}var a=Array.from(f());a[0]()===0&&a[1]()===1&&a[2]()===2;",
    "function* f(){for(var i=0;i<3;i++){yield ()=>i;}}var a=Array.from(f());a[0]()===3&&a[1]()===3&&a[2]()===3;",
    "var trace=\"\";function* f(){for(var i=(trace+=\"I\",0);(trace+=\"T\",i<2);(trace+=\"U\",i++)){trace+=\"B\";yield i;trace+=\"A\";}}var g=f();g.next();var a=trace;g.next();var b=trace;g.next();a===\"ITB\"&&b===\"ITBAUTB\"&&trace===\"ITBAUTBAUT\";",
    "function* f(){for(let i=0;i<5;i++){if(i===1)continue;yield i;if(i===3)break;}yield 8;}Array.from(f()).join(\",\")===\"0,2,3,8\";",
    "function* f(){for(let i=0;i<3;i++){yield i;continue;}yield 8;}Array.from(f()).join(\",\")===\"0,1,2,8\";",
    "function* f(){for(const i=2;i===2;){yield i;break;}yield 8;}Array.from(f()).join(\",\")===\"2,8\";",
    "function* f(){for(let i=0;i<2;i++){for(let j=0;j<2;j++){yield ()=>i*10+j;}}}var a=Array.from(f());a[0]()===0&&a[1]()===1&&a[2]()===10&&a[3]()===11;",
    "var n=0;function* f(){for(;;n++){yield n;}}var g=f();g.next();var r=g.return(7);r.value===7&&r.done&&n===0;",
    "var marker={},n=0;function* f(){for(;;n++){yield n;}}var g=f(),caught;g.next();try{g.throw(marker);}catch(e){caught=e;}caught===marker&&n===0&&g.next().done;",
    "var marker={};function fail(){throw marker;}function* f(){for(var i=0;i<2;fail()){yield i;}}var g=f(),caught;g.next();try{g.next();}catch(e){caught=e;}caught===marker&&g.next().done;",
    "function* f(){for(let i=0;i<2;i++){yield ()=>++i;yield i;}}var g=f(),h=g.next().value;h()===1&&g.next().value===1&&g.next().done;",
    "var initial;function* f(){for(let i=(initial=()=>i,0);i<2;i++){yield ()=>i;}}var a=Array.from(f());initial()===0&&a[0]()===0&&a[1]()===1;",
    "function* f(){for(let i=0;i<2;i++){yield eval(\"i\");}return typeof i;}var g=f();g.next().value===0&&g.next().value===1&&g.next().value===\"undefined\";",
    "function* f(){for(let i=0;i<2;i++){var j=0;while(j++<2){yield i*10+j;continue;}}}Array.from(f()).join(\",\")===\"1,2,11,12\";"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"for case "+i);}
for(const source of ["function* f(){for(var x of [])yield 1;}","function* f(){for(var x in {})yield 1;}","function* f(){for(let i=yield 1;;){}}"]){check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","boundary "+source);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('function* f(){for(let i=0;i<2;i++){yield ()=>i;}}var g=f();',A);define(B,"g",own(A,"g"));
run('var a=g.next().value;',B);const cross=run('var b=g.next().value;a()===0&&b()===1&&g.next().done;',B);
check(cross.type==="normal"&&cross.value.kind==="boolean"&&cross.value.value,"foreign for iteration cells");
console.log("generator for passed");
