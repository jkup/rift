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
const cases = [
    'function* f(){yield 1;}var g=f();g.next().value===1&&g.next().done;',
    '{function* inner(){return 1;}if(inner().next().value!==1)throw 2;}typeof inner==="undefined";',
    'eval("{function* hidden(){}}");typeof hidden==="undefined";',
    'switch(1){case 1:function* hidden(){return 2;}if(hidden().next().value!==2)throw 3;}typeof hidden==="undefined";',
    'var n=0;function* f(){n++;return 7;}var g=f();var before=n;var a=g.next(99),b=g.next();before===0&&n===1&&a.value===7&&a.done&&b.value===undefined&&b.done;',
    'function* f(){}var g=f(),a=g.next();a.done&&a.value===undefined&&g.next().done;',
    'var n=0;function* f(a=(n++,3)){n+=10;return a;}var g=f();var before=n;before===1&&g.next().value===3&&n===11;',
    'var marker={};function fail(){throw marker;}function* f(a=fail()){return 2;}var caught;try{f();}catch(e){caught=e;}caught===marker;',
    'function* f(a){arguments[0]=9;return a;}f(2).next().value===9;',
    'function* f(a){"use strict";arguments[0]=9;return a;}f(2).next().value===2;',
    'function* f(a,...rest){return a+rest[0]+rest.length;}f(2,3,4).next().value===7;',
    'function* f(){return this;}f().next().value===globalThis;',
    'function* f(){"use strict";return this;}f().next().value===undefined;',
    'function* f(){return this.x;}f.call({x:8}).next().value===8;',
    'function make(){let x=2;function* f(){return x;}var g=f();x=8;return g;}make().next().value===8;',
    'var f=function* self(){return self;};f().next().value===f&&f.name==="self"&&typeof self==="undefined";',
    'var f=function*(){return 2;};f.name==="f"&&f().next().value===2;',
    'function* f(){return new.target;}f().next().value===undefined;',
    'function* f(a){return eval("a+3");}f(4).next().value===7;',
    'var trace="";function* f(){try{trace+="T";return 3;}finally{trace+="F";}}var g=f();var before=trace;g.next().value===3&&before===""&&trace==="TF";',
    'var n=0;function* f(){try{n++;}finally{n++;}}var g=f(),r=g.return(5);r.done&&r.value===5&&n===0&&g.next().done&&g.return(9).value===9;',
    'var n=0,marker={};function* f(){n++;}var g=f(),caught;try{g.throw(marker);}catch(e){caught=e;}caught===marker&&n===0&&g.next().done;',
    'var marker={};function* f(){throw marker;}var g=f(),caught;try{g.next();}catch(e){caught=e;}caught===marker&&g.next().done;',
    'function* f(){return 2;}var g=f(),marker={},caught;g.next();try{g.throw(marker);}catch(e){caught=e;}caught===marker;',
    'var g;function* f(){var count=0;try{g.next();}catch(e){if(e instanceof TypeError)count++;}try{g.return();}catch(e){if(e instanceof TypeError)count++;}try{g.throw();}catch(e){if(e instanceof TypeError)count++;}return count;}g=f();g.next().value===3;',
    'function* f(){}var g=f(),p=Object.getPrototypeOf(g),gp=Object.getPrototypeOf(p),fp=Object.getPrototypeOf(f),GF=fp.constructor;Object.getPrototypeOf(fp)===Function.prototype&&p===f.prototype&&!Object.hasOwn(p,"constructor")&&gp.constructor===fp&&fp.prototype===gp&&Object.getPrototypeOf(GF)===Function&&typeof fp==="object";',
    'function* f(){}var p=Object.getPrototypeOf(f),gp=p.prototype,d=Object.getOwnPropertyDescriptor(f,"prototype"),c=Object.getOwnPropertyDescriptor(p,"constructor"),n=Object.getOwnPropertyDescriptor(gp,"next");d.writable&&!d.enumerable&&!d.configurable&&!c.writable&&c.configurable&&n.writable&&!n.enumerable&&n.configurable&&gp.next.name==="next"&&gp.next.length===1;',
    'function* f(){}Object.prototype.toString.call(f)==="[object GeneratorFunction]"&&Object.prototype.toString.call(f())==="[object Generator]";',
    'function* f(a,b=3,...rest){}f.length===1&&f.name==="f"&&f.toString()==="function* f(a,b=3,...rest){}";',
    'function* f(){return 2;}var p={};f.prototype=p;Object.getPrototypeOf(f())===p;',
    'function* f(){}var expected=Object.getPrototypeOf(f).prototype;f.prototype=1;Object.getPrototypeOf(f())===expected;',
    'function* f(a){return a;}f.bind(null,5)().next().value===5;',
    'var n=0;function* f(){n++;return 8;}var g=f(),a=Array.from(g);g[Symbol.iterator]()===g&&a.length===0&&n===1;',
    'function* f(){}var GF=Object.getPrototypeOf(f).constructor,g=GF("a","return a+2;");g(5).next().value===7&&g.name==="anonymous"&&g.toString().includes("function* anonymous");',
    'function* f(){}var GF=Object.getPrototypeOf(f).constructor;new GF("return 8")().next().value===8;',
    'function* f(){}var GF=Object.getPrototypeOf(f).constructor;function N(){}var g=Reflect.construct(GF,["return 9"],N);Object.getPrototypeOf(g)===N.prototype&&g().next().value===9;',
    'function* f(){return 2;}var count=0;try{new f();}catch(e){if(e instanceof TypeError)count++;}try{Reflect.construct(f,[]);}catch(e){if(e instanceof TypeError)count++;}try{class C extends f{}}catch(e){if(e instanceof TypeError)count++;}count===3;',
    'function* f(){}var p=Object.getPrototypeOf(f).prototype,n=0;try{p.next.call({});}catch(e){if(e instanceof TypeError)n++;}try{p.return.call(p);}catch(e){if(e instanceof TypeError)n++;}try{p.throw.call(null);}catch(e){if(e instanceof TypeError)n++;}n===3;',
];
for (let i=0;i<cases.length;i++) {
    const realm = new Realm((_line: string): void => {}, "script");
    const result = run(cases[i], realm);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "case " + i);
}
for (const source of ['function* f(a,a){}','var f=function* (a,a){};','var o={*f(){}};','async function* f(){}']) {
    const realm = new Realm((_line: string): void => {}, "script");
    check(prepareBoundedScript({id:"unsupported",text:source},realm).kind === "blocked", "boundary " + source);
}
const A = new Realm((_line: string): void => {}, "script"), B = new Realm((_line: string): void => {}, "script");
const first = createScriptSession(), second = createScriptSession();
check(run('var count=0;function* f(a=2){count++;let x=a;return function(){return x+count;};}var g=f();function* fail(){throw new TypeError("body");}var bad=fail();function* costly(){while(true){count++;}}var slow=costly();',A,first).type === "normal", "cross setup");
check(run('function* empty(){}var next=Object.getPrototypeOf(empty).prototype.next;',B).type === "normal", "borrow setup");
define(B,"g",own(A,"g"));define(B,"bad",own(A,"bad"));define(B,"slow",own(A,"slow"));
const firstSteps = first.inspect().steps;
const cross = run('var result=next.call(g);result.done&&Object.getPrototypeOf(result)===Object.prototype&&result.value()===3;',B,second);
check(cross.type === "normal" && cross.value.kind === "boolean" && cross.value.value, "foreign saved frame/result Realm");
check(first.inspect().steps===firstSteps&&second.inspect().steps>0,"resume current budget");
const failure = run('next.call(bad);',B,second);
check(failure.type === "throw" && failure.value.kind === "object" && failure.value.object.getPrototypeOf()===A.getErrorPrototype("TypeError"),"body error Realm");
check(second.inspect().lastAbrupt?.realm===A,"body source Realm");
const limited=createScriptSession({maxSteps:60,maxCalls:16}), stopped=run('next.call(slow);',B,limited);
check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit"&&first.inspect().steps===firstSteps,"current resume resource stop");
const done=run('next.call(slow).done;',B);
check(done.type==="normal"&&done.value.kind==="boolean"&&done.value.value,"resource completion closes state");
const sentinel = new Error("generator host fault");
define(A, "hostFault", { kind: "object", object: A.createBuiltin("hostFault", 0,
    (_receiver: Value, _args: Value[], _context: OperationContext, _loc: Location): ValueCompletion => { throw sentinel; }) });
check(run('function* faulty(){hostFault();}var broken=faulty();', A).type === "normal", "host fault setup");
define(B, "broken", own(A, "broken"));
const faultSession = createScriptSession();
let caught = false;
try { run('next.call(broken);', B, faultSession); } catch (error) { if (error instanceof Error) caught = error === sentinel; }
const idle = faultSession.inspect();
check(caught && idle.active === null && idle.calls === 0 && idle.depth === 0, "host fault identity/restoration");
const closed = run('next.call(broken).done;', B);
check(closed.type === "normal" && closed.value.kind === "boolean" && closed.value.value, "host fault completes generator");
check(run('var unopened=f();', A).type === "normal", "unopened setup");
define(B, "unopened", own(A, "unopened"));
const noCalls = run('next.call(unopened);', B, createScriptSession({maxSteps:100,maxCalls:0}));
check(noCalls.type === "throw" && noCalls.origin.kind === "resource-limit", "entry call limit");
const opened = run('typeof next.call(unopened).value==="function";', B);
check(opened.type === "normal" && opened.value.kind === "boolean" && opened.value.value, "entry limit leaves suspended start");
console.log("generator start passed");
