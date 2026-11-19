import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import { type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    source: string,
    realm: Realm,
    session: ScriptSession = createScriptSession(),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "generator-start", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + prepared.kind + ": " + source);
    }
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "caller state restored");
    return result;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("missing " + name);
    }
    return property.value;
}
function define(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, enumerable: true, configurable: true });
}
const cases: string[] = [
    'function* f(){for(const k in {a:1,b:2})yield k;}Array.from(f()).join(",")==="a,b";',
    'function* f(){for(let k in {a:1,b:2})yield ()=>k;}var a=Array.from(f());a[0]()==="a"&&a[1]()==="b";',
    'function* f(){for(var k in {a:1,b:2})yield ()=>k;}var a=Array.from(f());a[0]()==="b"&&a[1]()==="b";',
    'function* f(){for(let [k] in {ab:1,cd:2})yield k;}Array.from(f()).join(",")==="a,c";',
    'var o={a:1,b:2,c:3};function* f(){for(const k in o)yield k;}var g=f(),a=g.next();delete o.b;a.value==="a"&&g.next().value==="c"&&g.next().done;',
    'var p={a:1,b:2},o=Object.create(p);Object.defineProperty(o,"a",{value:3,enumerable:false});o.c=4;function* f(){for(const k in o)yield k;}Array.from(f()).join(",")==="c,b";',
    'function* f(){for(const k in {2:1,1:1,a:1})yield k;}Array.from(f()).join(",")==="1,2,a";',
    'function* f(){for(const k in null)yield k;for(const k in undefined)yield k;yield 1;}Array.from(f()).join(",")==="1";',
    "var o={a:1};function* f(){for(let o in o)yield o;}var caught=false;try{f().next();}catch(e){caught=e instanceof ReferenceError;}caught;",
    'function* f(){for(const k in {a:1,b:2,c:3}){if(k==="b")continue;yield k;if(k==="c")break;}yield "z";}Array.from(f()).join(",")==="a,c,z";',
    'var n=0,o={a:1,b:2};Object.defineProperty(o,"return",{value:function(){n++;return {};}});function* f(){for(const k in o)yield k;}var g=f();g.next();g.return(7).value===7&&n===0;',
    'function* f(){try{for(const k in {a:1,b:2})yield k;}finally{yield "F";}}var g=f();g.next();g.return(7).value==="F"&&g.next().value===7;',
    'function* f(){for(const k in {a:1,b:2}){try{yield k;continue;}finally{yield "F";}}}Array.from(f()).join(",")==="a,F,b,F";',
    "var closed=0,it={next(){return {value:1,done:false};},return(){closed++;return {};},[Symbol.iterator](){return this;}};function* f(){for(const x of it){for(const k in {a:1,b:2})yield k;}}var g=f();g.next();g.return(7).value===7&&closed===1;",
    'var o={};function* f(){for(o.k in {a:1,b:2})yield o.k;}Array.from(f()).join(",")==="a,b"&&o.k==="b";',
];
for (let i = 0; i < cases.length; i++) {
    const r = run(cases[i], new Realm((_line: string): void => {}, "script"));
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, "for-in case " + i);
}
const A = new Realm((_line: string): void => {}, "script"),
    B = new Realm((_line: string): void => {}, "script");
run("var object={a:1,b:2,c:3};function* f(){for(let key in object)yield ()=>key;}var g=f();", A);
define(B, "g", own(A, "g"));
define(B, "objectA", own(A, "object"));
const cross = run(
    'var a=g.next().value;delete objectA.b;var c=g.next().value;a()==="a"&&c()==="c"&&g.next().done;',
    B,
);
check(
    cross.type === "normal" && cross.value.kind === "boolean" && cross.value.value,
    "foreign saved enumeration and lexical cells",
);
console.log("generator for-in passed");
