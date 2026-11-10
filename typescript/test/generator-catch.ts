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
"function* f(){try{yield 1;}catch(e){yield e;}finally{}}var g=f();g.next();g.return();g.next().done;",
"function* f(){try{yield 1;}finally{}}var g=f();g.next();g.return();g.next().done;",
    "var marker={};function* f(){try{yield 1;yield 2;}catch(e){yield e;}yield 3;}var g=f();g.next().value===1&&g.throw(marker).value===marker&&g.next().value===3&&g.next().done;",
    "var marker={};function* f(){try{yield 1;throw marker;}catch(e){yield e;}yield 3;}var g=f();g.next().value===1&&g.next().value===marker&&g.next().value===3;",
    "function* f(){try{yield 1;}catch(e){yield 2;}yield 3;}Array.from(f()).join(\",\")===\"1,3\";",
    "function* f(){try{throw 2;}catch(e){yield ()=>++e;yield e;}}var g=f(),h=g.next().value;h()===3&&g.next().value===3;",
    "function* f(){let e=9;try{yield 1;}catch(e){yield e;}yield e;}var g=f();g.next();g.throw(2).value===2&&g.next().value===9;",
    "function* f(){try{try{yield 1;}catch(e){yield e;throw 3;}}catch(e){yield e;}yield 4;}var g=f();g.next();g.throw(2).value===2&&g.next().value===3&&g.next().value===4;",
    "function* f(){try{try{yield 1;}catch(e){yield 2;}}catch(e){yield e;}}var g=f();g.next();g.throw(9);g.throw(3).value===3&&g.next().done;",
    "var n=0;function* f(){try{yield 1;}catch(e){n++;yield e;}n++;}var g=f();g.next();g.return(7).value===7&&n===0&&g.next().done;",
    "function* f(){var i=0;while(i<3){i++;try{yield i;if(i===2)break;}catch(e){yield 9;}}yield 8;}Array.from(f()).join(\",\")===\"1,2,8\";",
    "function* f(){for(var i=0;i<2;i++){try{yield i;continue;}catch(e){yield 9;}}yield 8;}Array.from(f()).join(\",\")===\"0,1,8\";",
    "function fail(){throw 7;}function* f(){try{do{yield 1;}while(fail());}catch(e){yield e;}}Array.from(f()).join(\",\")===\"1,7\";",
    "function fail(){throw 7;}function* f(){try{for(var i=0;i<2;fail()){yield i;}}catch(e){yield e;}}Array.from(f()).join(\",\")===\"0,7\";",
    "var closed=0,it={next(){return {value:1,done:false};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){try{yield* it;}catch(e){yield e instanceof TypeError;}yield closed;}var g=f();g.next();g.throw(4).value===true&&g.next().value===1;",
    "var marker={},it={next(){throw marker;},[Symbol.iterator](){return this;}};function* f(){try{yield* it;}catch(e){yield e;}yield 2;}var g=f();g.next().value===marker&&g.next().value===2;",
    "function* f(){try{throw 2;}catch(e){yield eval(\"e+1\");}}f().next().value===3;",
    "function* f(){try{yield 1;}catch(e){yield ()=>e;}}var g=f();g.next();var h=g.throw(4).value;g.next().done&&h()===4;",
    "var marker={};function* f(){try{yield 1;}catch(e){throw marker;}}var g=f(),caught;g.next();try{g.throw(2);}catch(e){caught=e;}caught===marker&&g.next().done;"
];
for(let i=0;i<cases.length;i++){const r=run(cases[i],new Realm((_line:string):void=>{},"script"));check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,"catch case "+i);}
for(const source of []){check(prepareBoundedScript({id:"boundary",text:source},new Realm((_line:string):void=>{},"script")).kind==="blocked","boundary "+source);}
const A=new Realm((_line:string):void=>{},"script"),B=new Realm((_line:string):void=>{},"script");
run('var caught=false;function* f(){try{yield 1;}catch(e){yield e instanceof TypeError;yield ()=>e;}}var g=f();g.next();function* costly(){try{yield 1;while(true){}}catch(e){caught=true;yield 2;}}var slow=costly();slow.next();',A);
define(B,"g",own(A,"g"));define(B,"slow",own(A,"slow"));define(B,"errorA",{kind:"object",object:A.createError("TypeError","caught")});
const foreign=run('g.throw(errorA).value===true;',B);check(foreign.type==="normal"&&foreign.value.kind==="boolean"&&foreign.value.value,"foreign catch Realm");
const closure=run('g.next().value()===errorA;',B);check(closure.type==="normal"&&closure.value.kind==="boolean"&&closure.value.value,"foreign catch cell");
const stopped=run('slow.next();',B,createScriptSession({maxSteps:60,maxCalls:16}));check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit","resource bypasses catch");
const untouched=run('!caught&&slow.next().done;',A);check(untouched.type==="normal"&&untouched.value.kind==="boolean"&&untouched.value.value,"resource closes without catch effects");
console.log("generator catch passed");
