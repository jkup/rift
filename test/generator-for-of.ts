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
    "function* f(){for(const x of [1,2,3])yield x;}Array.from(f()).join(\",\")===\"1,2,3\";",
    "function* f(){for(let x of [1,2,3])yield ()=>x;}var a=Array.from(f());a[0]()===1&&a[1]()===2&&a[2]()===3;",
    "function* f(){for(var x of [1,2,3])yield ()=>x;}var a=Array.from(f());a[0]()===3&&a[1]()===3;",
    "function* f(){for(const [x,y] of [[1,2],[3,4]])yield x+y;}Array.from(f()).join(\",\")===\"3,7\";",
    "function* f(){for(let {x} of [{x:1},{x:2}])yield ()=>x;}var a=Array.from(f());a[0]()===1&&a[1]()===2;",
    "var o={},n=0;function* f(){for(o.x of [1,2]){n++;yield o.x;}}Array.from(f()).join(\",\")===\"1,2\"&&o.x===2&&n===2;",
    "var x;function* f(){for([x] of [[1],[2]])yield x;}Array.from(f()).join(\",\")===\"1,2\"&&x===2;",
    "var xs=[1];function* f(){for(let xs of xs)yield xs;}var g=f(),caught=false;try{g.next();}catch(e){caught=e instanceof ReferenceError;}caught&&g.next().done;",
    "var n=0,closed=0,it={next(){return {value:++n,done:n>2};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){for(const x of it){yield x;continue;}}Array.from(f()).join(\",\")===\"1,2\"&&closed===0;",
    "var closed=0,it={next(){return {value:1,done:false};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){for(const x of it){yield x;break;}yield closed;}var g=f();g.next().value===1&&g.next().value===1&&closed===1;",
    "var trace=\"\",it={next(){return {value:1,done:false};},return(){trace+=\"C\";return {};},[Symbol.iterator](){return this;}};function* f(){try{for(const x of it)yield x;}finally{trace+=\"F\";yield 2;}}var g=f();g.next();g.return(7).value===2&&trace===\"CF\"&&g.next().value===7;",
    "var trace=\"\",it={next(){return {value:1,done:false};},return(){trace+=\"C\";return {};},[Symbol.iterator](){return this;}};function* f(){for(const x of it){try{yield x;}finally{trace+=\"F\";yield 2;}}}var g=f();g.next();var a=g.return(7),before=trace,b=g.next();a.value===2&&before===\"F\"&&b.value===7&&trace===\"FC\";",
    "var marker={},cleanup={},closed=0,it={next(){return {value:1,done:false};},return(){closed++;throw cleanup;},[Symbol.iterator](){return this;}};function* f(){for(const x of it)yield x;}var g=f(),caught;g.next();try{g.throw(marker);}catch(e){caught=e;}caught===marker&&closed===1&&g.next().done;",
    "var marker={},it={next(){return {value:1,done:false};},return(){throw marker;},[Symbol.iterator](){return this;}};function* f(){try{for(const x of it)yield x;}catch(e){yield e;}}var g=f();g.next();g.return(7).value===marker&&g.next().done;",
    "var marker={},closed=0,it={next(){throw marker;},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){for(const x of it)yield x;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&closed===0;",
    "var marker={},closed=0,it={next(){return {get done(){throw marker;}};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){for(const x of it)yield x;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&closed===0;",
    "var marker={},closed=0,it={next(){return {done:false,get value(){throw marker;}};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){for(const x of it)yield x;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&closed===0;",
    "var closed=0,it={next(){return {value:null,done:false};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){for(const {x} of it)yield x;}var g=f(),caught=false;try{g.next();}catch(e){caught=e instanceof TypeError;}caught&&closed===1;",
    "var trace=\"\";function it(name){return {next(){return {value:1,done:false};},return(){trace+=name;return {};},[Symbol.iterator](){return this;}};}function* f(){for(const x of it(\"A\")){for(const y of it(\"B\"))yield x+y;}}var g=f();g.next();g.return(7).value===7&&trace===\"BA\";",
    "var it={next(){return {value:1,done:false};},return(){return 1;},[Symbol.iterator](){return this;}};function* f(){for(const x of it)yield x;}var g=f(),caught=false;g.next();try{g.return(7);}catch(e){caught=e instanceof TypeError;}caught&&g.next().done;",
    "var count=0,args=-1,it={get next(){count++;return function(){args=arguments.length;return {value:1,done:false};};},[Symbol.iterator](){return this;}};function* f(){for(const x of it)yield x;}var g=f();g.next();g.next();count===1&&args===0;"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"for-of case "+i);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('var cleanup={},it={next(){return {value:1,done:false};},return(){throw cleanup;},[Symbol.iterator](){return this;}};',B);define(A,"it",own(B,"it"));
run('var marker={};function* f(){for(const x of it)yield x;}var g=f();g.next();',A);define(B,"g",own(A,"g"));define(B,"marker",own(A,"marker"));
const session=createScriptSession(),failure=run('g.throw(marker);',B,session),marker=own(A,"marker");
check(failure.type==="throw"&&failure.value.kind==="object"&&marker.kind==="object"&&failure.value.object===marker.object,"iterator close preserves throw identity");
check(session.inspect().lastAbrupt?.realm===A,"iterator close preserves original throw source Realm");
run('var closed=false,source={next(){return {value:1,done:false};},return(){closed=true;return {};},[Symbol.iterator](){return this;}};function* costly(){for(const x of source){yield x;while(true){}}}var slow=costly();slow.next();',A);
const stopped=run('slow.next();',A,createScriptSession({maxSteps:60,maxCalls:16}));check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit","iterator resource stop");
const untouched=run('!closed&&slow.next().done;',A);check(untouched.type==="normal"&&untouched.value.kind==="boolean"&&untouched.value.value,"resource stop skips iterator close");
console.log("generator for-of passed");
