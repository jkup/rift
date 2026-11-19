import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value, ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm: Realm): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-instant-core", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function own(realm: Realm, name: string): Value {
    const descriptor = realm.globalObject.getOwnProperty(name);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("missing " + name);
    }
    return descriptor.value;
}
const cases = [
    'Object.prototype.toString.call(Temporal)==="[object Temporal]"&&Object.getPrototypeOf(Temporal)===Object.prototype',
    'Temporal.Instant.name==="Instant"&&Temporal.Instant.length===1&&typeof Temporal.Instant==="function"',
    "var x=new Temporal.Instant(9007199254740993n);x.epochNanoseconds===9007199254740993n&&x.epochMilliseconds===9007199254",
    "new Temporal.Instant(-1n).epochMilliseconds===-1&&new Temporal.Instant(-1000000n).epochMilliseconds===-1&&new Temporal.Instant(-1000001n).epochMilliseconds===-2",
    'new Temporal.Instant("7").epochNanoseconds===7n&&new Temporal.Instant(true).epochNanoseconds===1n',
    "Temporal.Instant.fromEpochMilliseconds(1).epochNanoseconds===1000000n&&Temporal.Instant.fromEpochMilliseconds(-1).epochNanoseconds===-1000000n",
    'Temporal.Instant.fromEpochMilliseconds("7").epochMilliseconds===7&&Temporal.Instant.fromEpochMilliseconds(null).epochMilliseconds===0',
    'Temporal.Instant.fromEpochNanoseconds("7").epochNanoseconds===7n',
    "new Temporal.Instant(8640000000000000000000n).epochMilliseconds===8640000000000000&&new Temporal.Instant(-8640000000000000000000n).epochMilliseconds===-8640000000000000",
    "Temporal.Instant.fromEpochMilliseconds(8640000000000000).epochNanoseconds===8640000000000000000000n",
    'var x=new Temporal.Instant(0n);Object.getPrototypeOf(x)===Temporal.Instant.prototype&&Object.keys(x).length===0&&Object.prototype.toString.call(x)==="[object Temporal.Instant]"',
    "class Sub extends Temporal.Instant{}var x=new Sub(7n);x instanceof Sub&&x instanceof Temporal.Instant&&x.epochNanoseconds===7n",
    'function Target(){}var x=Reflect.construct(Temporal.Instant,[7n],Target);Object.getPrototypeOf(x)===Target.prototype&&Object.getOwnPropertyDescriptor(Temporal.Instant.prototype,"epochNanoseconds").get.call(x)===7n',
    "function Target(){}Target.prototype=null;Object.getPrototypeOf(Reflect.construct(Temporal.Instant,[0n],Target))===Temporal.Instant.prototype",
    "class Sub extends Temporal.Instant{}Object.getPrototypeOf(Sub.fromEpochNanoseconds(1n))===Temporal.Instant.prototype",
    'var d=Object.getOwnPropertyDescriptor(Temporal.Instant.prototype,"epochNanoseconds");typeof d.get==="function"&&d.get.name==="get epochNanoseconds"&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Instant,"prototype");!d.writable&&!d.enumerable&&!d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal,"Instant");d.writable&&!d.enumerable&&d.configurable',
    "Temporal.Instant.fromEpochMilliseconds.length===1&&Temporal.Instant.fromEpochNanoseconds.length===1&&Temporal.Instant.prototype.valueOf.length===0",
    "var n=0,value={valueOf(){n++;return 1n}};try{Temporal.Instant(value)}catch(e){}n===0",
    'var trace="",value={valueOf(){trace+="V";return 1n}},Target=(function(){}).bind(null);Object.defineProperty(Target,"prototype",{get(){trace+="P";return {}}});Reflect.construct(Temporal.Instant,[value],Target);trace==="VP"',
    'var trace="",value={valueOf(){trace+="V";return 8640000000000000000001n}},Target=(function(){}).bind(null);Object.defineProperty(Target,"prototype",{get(){trace+="P";return {}}});try{Reflect.construct(Temporal.Instant,[value],Target)}catch(e){trace+=e instanceof RangeError?"R":"?"}trace==="VR"',
    'var hint="";Temporal.Instant.fromEpochMilliseconds({[Symbol.toPrimitive](h){hint=h;return 7}}).epochMilliseconds===7&&hint==="number"',
    "var ok=false;try{Temporal.Instant(0n)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant()}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(null)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(Symbol())}catch(e){ok=e instanceof TypeError}ok",
    'var ok=false;try{new Temporal.Instant("1.5")}catch(e){ok=e instanceof SyntaxError}ok',
    "var ok=false;try{new Temporal.Instant(8640000000000000000001n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(-8640000000000000000001n)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{Temporal.Instant.fromEpochNanoseconds(1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Temporal.Instant.fromEpochMilliseconds(1n)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Temporal.Instant.fromEpochMilliseconds(1.1)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{Temporal.Instant.fromEpochMilliseconds(NaN)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{Temporal.Instant.fromEpochMilliseconds(Infinity)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{Temporal.Instant.fromEpochMilliseconds(8640000000000001)}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{Temporal.Instant.prototype.epochNanoseconds}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Object.create(Temporal.Instant.prototype).epochMilliseconds}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{+new Temporal.Instant(0n)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Temporal.Instant.prototype.valueOf.call({})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant.fromEpochNanoseconds(0n)}catch(e){ok=e instanceof TypeError}ok",
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "instant core case " + i,
    );
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
run("var factory=Temporal.Instant.fromEpochNanoseconds;var C=Temporal.Instant", defining);
calling.defineScriptGlobal("factory", { value: own(defining, "factory") });
calling.defineScriptGlobal("C", { value: own(defining, "C") });
const created = run("factory(1n)", calling);
check(
    created.type === "normal" &&
        created.value.kind === "object" &&
        created.value.object.getPrototypeOf() === defining.temporalInstantPrototype,
    "static factory defining Realm",
);
const invalid = run("factory(1)", calling);
check(
    invalid.type === "throw" &&
        invalid.value.kind === "object" &&
        invalid.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "conversion error defining Realm",
);
const derived = run(
    "function Target(){}Target.prototype=0;Reflect.construct(C,[1n],Target)",
    calling,
);
check(
    derived.type === "normal" &&
        derived.value.kind === "object" &&
        derived.value.object.getPrototypeOf() === calling.temporalInstantPrototype,
    "newTarget fallback Realm",
);
check(
    defining.temporalInstantPrototype !== calling.temporalInstantPrototype,
    "prototype isolation",
);
console.log("temporal instant core passed");
