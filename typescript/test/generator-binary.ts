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
    "function* f(){return (yield 1)+(yield 2);}var g=f();g.next().value===1&&g.next(3).value===2&&g.next(4).value===7&&g.next().done;",
    "function* f(){return 2*((yield 1)+(3*(yield 2)));}var g=f();g.next();g.next(4);g.next(5).value===38;",
    "function* f(){var x=1+(yield 2);return x;}var g=f();g.next();g.next(7).value===8;",
    "var read;function* f(){read=()=>x;let x=(yield 1)+(yield 2);return x;}var g=f();g.next();var n=0;try{read();}catch(e){if(e instanceof ReferenceError)n++;}g.next(3);try{read();}catch(e){if(e instanceof ReferenceError)n++;}n===2&&g.next(4).value===7;",
    "function* f(){var x;x=1+(yield 2);return x;}var g=f();g.next();g.next(7).value===8;",
    "var trace=\"\",o={get x(){trace+=\"G\";return 1;},set x(v){trace+=\"S\"+v;}};function* f(){o.x+=(yield 2)+(yield 3);}var g=f();g.next();var a=trace;g.next(4);var b=trace;g.next(5);a===\"G\"&&b===\"G\"&&trace===\"GS10\";",
    "function* f(){let [x]=((yield 1),(yield 2));return x;}var g=f();g.next();g.next(3);g.next([7]).value===7;",
    "function* f(){try{throw 1+(yield 2);}catch(e){return e;}}var g=f();g.next();g.next(7).value===8;",
    "var trace=\"\",left={valueOf(){trace+=\"L\";return 2;}};function* f(){return left+(yield 1);}var g=f();g.next();var before=trace;left.valueOf=function(){trace+=\"V\";return 5;};before===\"\"&&g.next(3).value===8&&trace===\"V\";",
    "var n=0,old={valueOf(){n++;return 2;}},left=old;function* f(){return left+(yield 1);}var g=f();g.next();left=100;g.next(3).value===5&&n===1;",
    "var trace=\"\",left={valueOf(){trace+=\"L\";return 2;}},marker={};function fail(){throw marker;}function* f(){try{return left+((yield 1)+fail());}catch(e){return e;}}var g=f();g.next();g.next(3).value===marker&&trace===\"\";",
    "function* f(){return (yield 1)&&(yield 2);}var g=f();g.next();var r=g.next(false);r.done&&r.value===false;",
    "function* f(){return (yield 1)||(yield 2);}var g=f();g.next();var r=g.next(7);r.done&&r.value===7;",
    "function* f(){return (yield 1)&&(yield 2);}var g=f();g.next();g.next(7).value===2&&g.next(8).value===8;",
    "function* f(){return (yield 1)||(yield 2);}var g=f();g.next();g.next(0).value===2&&g.next(8).value===8;",
    "function* f(){return (yield 1),(yield 2);}var g=f();g.next();g.next(3).value===2&&g.next(7).value===7;",
    "function* f(){var x=false&&(yield 1);return x;}var r=f().next();r.done&&r.value===false;",
    "function* f(){var x=7||(yield 1);return x;}var r=f().next();r.done&&r.value===7;",
    "function* f(){(yield 1)+(yield 2);return 9;}var g=f();g.next();g.next(3).value===2&&g.next(4).value===9;",
    "function* inner(){yield 1;return 3;}function* f(){return (yield* inner())+(yield 2);}var g=f();g.next().value===1&&g.next().value===2&&g.next(4).value===7;",
    "function* inner(){yield 1;return 3;}function* f(){return (yield 2)+(yield* inner());}var g=f();g.next().value===2&&g.next(4).value===1&&g.next().value===7;",
    "var packet={done:false,value:2},it={next(){return packet;},return(v){return {done:true,value:v};},[Symbol.iterator](){return this;}};function* f(){return 1+(yield* it);}var g=f();g.next()===packet&&g.return(7).value===7&&g.next().done;",
    "var n=0,left={valueOf(){n++;return 1;}};function* f(){try{return left+(yield 2);}finally{yield 3;}}var g=f();g.next();g.return(7).value===3&&g.next().value===7&&n===0;",
    "var n=0,left={valueOf(){n++;return 1;}},marker={};function* f(){try{return left+(yield 2);}catch(e){return e;}}var g=f();g.next();g.throw(marker).value===marker&&n===0;",
    "var key={toString(){return \"x\";}};function* f(){return key in (yield 1);}var g=f();g.next();key.toString=function(){return \"y\";};g.next({y:7}).value===true;",
    "var right={[Symbol.hasInstance](x){return false;}};function* f(){return (yield 1) instanceof right;}var g=f();g.next();right[Symbol.hasInstance]=function(x){return x===7;};g.next(7).value===true;",
    "function* f(){return (yield 1)===3;}var g=f();g.next();g.next(3).value===true;",
    "function* f(){return 2**(yield 1);}var g=f();g.next();g.next(3).value===8;",
    "function* f(){return (yield 1)<(yield 2);}var g=f();g.next();g.next(3);g.next(4).value===true;",
    "var g,n=0,left={valueOf(){try{g.next();}catch(e){if(e instanceof TypeError)n++;}return 2;}};function* f(){return left+(yield 1);}g=f();g.next();g.next(3).value===5&&n===1;",
    "var trace=\"\";function side(){trace+=\"R\";return 7;}function* f(){return (yield 1)+side();}var g=f();g.next();var before=trace;before===\"\"&&g.next(3).value===10&&trace===\"R\";"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "binary case " + i);
}
for (const source of ["function* f(){return 1+yield 2;}", "function* f(){return yield 1+yield 2;}", "function* f(){return new yield 1;}", "function* f(){return foo(yield 1);}", "function* f(){return -(yield 1);}", "function* f(){return true?(yield 1):2;}", "function* f(){yield yield 1;}", "function* f(){yield 1+(yield 2);}", "function* f(){while(yield 1){}}"])
    check(prepareBoundedScript({id: "boundary", text: source}, new Realm((_line: string): void => {}, "script")).kind === "blocked", "binary boundary " + source);
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();
run('function* f(){return 1+(yield 2);}var g=f();g.next();var cleaned=false;function* costly(){try{return (yield 1)+2;}finally{cleaned=true;}}var slow=costly();slow.next();', A, creator);
define(B, "g", own(A, "g"));define(B, "slow", own(A, "slow"));
const steps = creator.inspect().steps, session = createScriptSession();
const failed = run('g.next(Symbol());', B, session);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"), "binary error Realm");
check(creator.inspect().steps === steps && session.inspect().steps > 0, "binary current session");
const stopped = run('slow.next({valueOf(){while(true){}}});', B, createScriptSession({maxSteps: 80, maxCalls: 16}));
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "binary coercion resource stop");
const closed = run('!cleaned&&slow.next().done;', A);
check(closed.type === "normal" && closed.value.kind === "boolean" && closed.value.value, "binary fatal discard");
const depthRealm = new Realm((_line: string): void => {}, "script");
const nested = "(yield 1)" + "+1".repeat(180);
const setup = run('var cleaned=false;function* deep(){try{return '+nested+';}finally{cleaned=true;}}var deepGenerator=deep(),control=deep();control.next();deepGenerator.next().value===1;', depthRealm);
check(setup.type === "normal" && setup.value.kind === "boolean" && setup.value.value, "deep expression initial suspension");
const depthStop = run('function descend(n){if(n===0)return deepGenerator.next(7);return descend(n-1);}descend(40);', depthRealm, createScriptSession({maxSteps:20000,maxCalls:200}));
check(depthStop.type === "throw" && depthStop.origin.kind === "resource-limit" && depthStop.origin.guardCode === "evaluation-depth", "resumed expression depth guard");
const depthClosed = run('!cleaned&&deepGenerator.next().done&&control.next(7).value===187;', depthRealm);
check(depthClosed.type === "normal" && depthClosed.value.kind === "boolean" && depthClosed.value.value, "deep expression fatal discard/control");
const longSource = 'function* long(){return (yield 1)' + '+1'.repeat(4000) + ';}long().next();';
const bounded = run(longSource, new Realm((_line: string): void => {}, "script"));
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit" && bounded.origin.guardCode === "evaluation-depth", "long binary tree has bounded evaluation without parser recursion");
console.log("generator binary passed");
