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
    "function* f(){var x;x=1+(yield 2);}var g=f();g.next().value===2&&g.next(7).done;",
    "function* f(){var x;x=yield 1;return x;}var g=f();g.next().value===1&&g.next(7).value===7;",
    "var x=1;function* f(){x+=yield 2;return x;}var g=f();g.next();x=100;g.next(3).value===4&&x===4;",
    "var trace=\"\",key={toString(){trace+=\"K\";return \"x\";}},left={valueOf(){trace+=\"A\";return 2;}},o={get x(){trace+=\"G\";return left;},set x(v){trace+=\"old\";}};function* f(){o[key]+=yield 1;return trace;}var g=f();g.next();var before=trace;key.toString=function(){throw 9;};left.valueOf=function(){trace+=\"V\";return 5;};Object.defineProperty(o,\"x\",{set(v){trace+=\"S\"+v;}});before===\"KG\"&&g.next(3).value===\"KGVS8\";",
    "var trace=\"\",key={toString(){trace+=\"A\";return \"a\";}},o={};function* f(){o[key]=yield 1;}var g=f();g.next();var before=trace;key.toString=function(){trace+=\"B\";return \"b\";};g.next(7);before===\"\"&&trace===\"B\"&&o.b===7&&!Object.hasOwn(o,\"a\");",
    "var trace=\"\",old={x:1},o=old;function target(){trace+=\"O\";return o;}function key(){trace+=\"K\";return \"x\";}function* f(){target()[key()]=yield (trace+=\"Y\",1);}var g=f();g.next();o={x:9};g.next(7);trace===\"OKY\"&&old.x===7&&o.x===9;",
    "function* f(){\"use strict\";try{missing=yield 1;}catch(e){return e instanceof ReferenceError;}}var g=f();g.next().value===1&&g.next(7).value===true;",
    "function* f(){\"use strict\";try{missing+=yield 1;}catch(e){return e instanceof ReferenceError;}}var r=f().next();r.value===true&&r.done;",
    "function* f(){const x=1;try{x=yield 2;}catch(e){return e instanceof TypeError&&x===1;}}var g=f();g.next().value===2&&g.next(7).value===true;",
    "var n=0;function* f(){const x=1;try{x+=yield 2;}catch(e){return e instanceof TypeError&&x===1&&n===1;}}var g=f();g.next();g.next({valueOf(){n++;return 3;}}).value===true;",
    "var x=1;function* f(){try{x+=yield 2;}finally{yield x;}}var g=f();g.next();g.return(7).value===1&&g.next().value===7&&x===1;",
    "var x=1,marker={};function* f(){try{x+=yield 2;}catch(e){yield e;return x;}}var g=f();g.next();g.throw(marker).value===marker&&g.next().value===1;",
    "function* inner(){yield 1;return 7;}function* f(){var x=2;x+=yield* inner();return x;}var g=f();g.next().value===1&&g.next().value===9;",
    "var x=1,it={next(){return {done:false,value:2};},return(v){return {done:true,value:v};},[Symbol.iterator](){return this;}};function* f(){x=yield* it;}var g=f();g.next();g.return(7).value===7&&x===1;",
    "var base={get x(){return this.v;},set x(v){this.v=v;}},o={__proto__:base,v:2,*f(){super.x+=yield 1;return this.v;}};var g=o.f();g.next();o.v=100;g.next(3).value===5&&o.v===5;",
    "function* f(){var x=2;x**=yield 1;return x;}var g=f();g.next();g.next(3).value===8;",
    "function* f(){var x=3;x<<=yield 1;return x;}var g=f();g.next();g.next(2).value===12;",
    "function* f(){var x=7;x&=yield 1;return x;}var g=f();g.next();g.next(3).value===3;",
    "var marker={},o={get x(){return 1;},set x(v){throw marker;}};function* f(){try{o.x+=yield 2;}catch(e){yield e;}}var g=f();g.next();g.next(3).value===marker;",
    "function* f(){var x;x=yield function(){};return x;}var g=f(),h=g.next().value;h.name===\"\"&&g.next(h).value===h;"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "assignment case " + i);
}
for (const source of [
    "function* f(){var a,b;a=b=yield 1;}",

    "function* f(){var x;x??=yield 1;}",
    "function* f(){var o={};o[yield 1]=2;}"
]) {
    const prepared = prepareBoundedScript({ id: "boundary", text: source }, new Realm((_line: string): void => {}, "script"));
    check(prepared.kind === "blocked", "boundary " + source);
}
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const creator = createScriptSession();
run('var o={};Object.defineProperty(o,"x",{value:1,writable:false});function* f(){"use strict";o.x=yield 1;}var g=f();g.next();var cleaned=false;function* costly(){try{var x=1;x+=yield 1;}finally{cleaned=true;}}var slow=costly();slow.next();', A, creator);
define(B, "g", own(A, "g"));
define(B, "slow", own(A, "slow"));
const steps = creator.inspect().steps, session = createScriptSession();
const failed = run('g.next(7);', B, session);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"), "resumed write error captured Realm");
check(creator.inspect().steps === steps && session.inspect().steps > 0, "assignment current session budget");
const stopped = run('slow.next({valueOf(){while(true){}}});', B, createScriptSession({ maxSteps: 80, maxCalls: 16 }));
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "resumed coercion resource stop");
const closed = run('!cleaned&&slow.next().done;', A);
check(closed.type === "normal" && closed.value.kind === "boolean" && closed.value.value, "resource stop discards pending reference");
console.log("generator assignment passed");
