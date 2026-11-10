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
"function* f(){for(var x of [])yield 1;}f().next().done;",
"function* f(){while(true){try{yield 1;}finally{}}}var g=f();g.next();g.return();g.next().done;",
"function* f(){for(;;){yield 1;}}var g=f();g.next().value===1&&g.return().done;",
    "var tests=0;function* f(){var i=0;while(++tests&&i<3){yield ++i;}}var g=f();var a=g.next(),b=g.next(),c=g.next(),d=g.next();a.value===1&&b.value===2&&c.value===3&&d.done&&tests===4;",
    "var trace=\"\";function* f(){var i=0;do{trace+=\"B\";yield ++i;}while((trace+=\"T\",i<2));}var g=f();g.next();var a=trace;g.next();var b=trace;g.next();a===\"B\"&&b===\"BTB\"&&trace===\"BTBT\";",
    "function* f(){var i=0;while(i<3){let x=++i;yield ()=>x;}}var a=Array.from(f());a[0]()===1&&a[1]()===2&&a[2]()===3;",
    "function* f(){var i=0;while(i<5){i++;if(i===2)continue;yield i;if(i===3)break;yield 9;}yield 7;}Array.from(f()).join(\",\")===\"1,9,3,7\";",
    "function* f(){var i=0;do{i++;yield i;continue;}while(i<3);yield 8;}Array.from(f()).join(\",\")===\"1,2,3,8\";",
    "function* f(){var i=0;while(i<2){var j=0;i++;while(j<3){yield i*10+(++j);if(j===2)break;}yield 0;}yield 9;}Array.from(f()).join(\",\")===\"11,12,0,21,22,0,9\";",
    "function* f(){var i=0;while(i<3){i++;if(i===2){yield 20;continue;}yield i;}yield 9;}Array.from(f()).join(\",\")===\"1,20,3,9\";",
    "var n=0;function* f(){while(++n){yield n;n+=10;}}var g=f();g.next();var r=g.return(7);r.value===7&&r.done&&n===1;",
    "var marker={},n=0;function* f(){do{yield ++n;n+=10;}while(true);}var g=f(),caught;g.next();try{g.throw(marker);}catch(e){caught=e;}caught===marker&&n===1&&g.next().done;",
    "function* f(){while(false)yield 1;do{yield 2;}while(false);yield 3;}Array.from(f()).join(\",\")===\"2,3\";",
    "function* f(){while(true){yield 1;return 2;}yield 3;}var g=f();g.next().value===1&&g.next().value===2&&g.next().done;",
    "var marker={};function test(){throw marker;}function* f(){do{yield 1;}while(test());}var g=f(),caught;g.next();try{g.next();}catch(e){caught=e;}caught===marker&&g.next().done;",
    "function* f(){var i=0;while(i<2){i++;for(var j=0;j<3;j++){if(j===1)break;}yield i*10+j;}}Array.from(f()).join(\",\")===\"11,21\";",
    "function* f(){var i=0;while(i<2){i++;try{if(i===1)continue;}finally{}yield i;}}Array.from(f()).join(\",\")===\"2\";"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"loop case "+i);}
for(const source of ["function* f(){outer:while(true){yield 1;continue outer;}}"]){check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","boundary "+source);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('function* f(){var i=0;while(i<2){let x=++i;yield ()=>x;}}var g=f();function* costly(){while(true){yield 1;while(true){}}}var slow=costly();slow.next();',A);
define(B,"g",own(A,"g"));define(B,"slow",own(A,"slow"));
const first=run('var a=g.next().value;',B),second=run('var b=g.next().value;a()===1&&b()===2&&g.next().done;',B);
check(first.type==="normal"&&second.type==="normal"&&second.value.kind==="boolean"&&second.value.value,"loop foreign frames");
const stopped=run('slow.next();',B,createScriptSession({maxSteps:60,maxCalls:16}));
check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit","loop current budget");
const done=run('slow.next().done;',B);
check(done.type==="normal"&&done.value.kind==="boolean"&&done.value.value,"loop resource closes continuation");
console.log("generator loops passed");
