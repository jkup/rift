import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import {
    createScriptSession,
    evaluateScript,
    type ScriptSession,
} from "../src/script-execution.js";
import { type Value, type ValueCompletion } from "../src/runtime.js";
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
const cases = [
    "var ok=false;try{class C extends C{}}catch(e){ok=e instanceof ReferenceError}ok",
    "var ok=false;try{class C{[C](){}}}catch(e){ok=e instanceof ReferenceError}ok",
    'var read;class A{}var C=class Inner extends (read=()=>Inner,A){};read()===C&&typeof Inner==="undefined"',
    'var read;var C=class Inner{[(read=()=>Inner,"m")](){return Inner}};read()===C&&new C().m()===C',
    'var read,C;function fail(){throw 8}try{C=class Inner{[(read=()=>Inner,fail())](){}}}catch(e){}var ok=false;try{read()}catch(e){ok=e instanceof ReferenceError}ok&&C===undefined&&typeof Inner==="undefined"',
    "var read;try{var C=class Inner extends (read=()=>Inner,1){}}catch(e){}var ok=false;try{read()}catch(e){ok=e instanceof ReferenceError}ok",
    "var C=class{[(function(){return this})()](){return 7}};new C().undefined()===7",
    'var caught=false;try{class C{[(function(){missing=1})()](){}}}catch(e){caught=e instanceof ReferenceError}afterClass=7;caught&&globalThis.afterClass===7&&typeof missing==="undefined"',
    'var log="",A=(function(){}).bind(null);Object.defineProperty(A,"prototype",{get(){log+="p";return null}});var C=class extends A{[(log+="k","m")](){return 7}};log==="pk"&&Object.getPrototypeOf(C.prototype)===null&&new C().m()===7',
    'var log="";function key(n){log+=n;return "m"+n}var C=class{[key(1)](){return 1}static [key(2)](){return 2}[key(3)](){return 3}};log==="123"&&new C().m1()===1&&C.m2()===2&&new C().m3()===3',
    'var n=0;function fail(){throw 8}try{class C{[fail()](){}[(n++,"m")](){}}}catch(e){}n===0',
    'var s=Symbol("x"),C=class{[s](){}get x(){return 7}set x(v){this.y=v}};var d=Object.getOwnPropertyDescriptor(C.prototype,"x"),o=new C();o.x=8;C.prototype[s].name==="[x]"&&d.get.name==="get x"&&d.set.name==="set x"&&o.y===8&&!d.enumerable',
    'var C=class{};var o={D:class{}};var F;F=class{};C.name==="C"&&o.D.name==="D"&&F.name==="F"',
    'var C=class Inner{};C.name==="Inner"&&typeof Inner==="undefined"',
    "class A{static m(){return this.x}m(){return this.x}}class B extends A{static m(){return super.m()+1}m(){return super.m()+1}}B.x=6;var b=new B();b.x=6;B.m()===7&&b.m()===7",
    "var C=class extends null{constructor(){return Object.create(new.target.prototype)}};Object.getPrototypeOf(C.prototype)===null&&new C() instanceof C",
    "var n=0;class A{constructor(){n++}}var C=class extends A{};n===0&&new C() instanceof A&&n===1",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "class evaluation case " + i,
    );
}
const A = new Realm((_line: string) => {}, "script"),
    B = new Realm((_line: string) => {}, "script"),
    creator = createScriptSession();
run(
    "function f(){return class extends 1{}}function h(){return class{[(function(){while(true){}})()](){}}}",
    A,
    creator,
);
define(B, "f", own(A, "f"));
define(B, "h", own(A, "h"));
const steps = creator.inspect().steps,
    result = run("f()", B);
check(
    result.type === "throw" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === A.getErrorPrototype("TypeError"),
    "class error Realm",
);
const stopped = run("h()", B, createScriptSession({ maxSteps: 100, maxCalls: 16 }));
check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "class current budget");
check(creator.inspect().steps === steps, "creator session untouched");
console.log("class evaluation passed");
