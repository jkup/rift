import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, configurable: true });
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("own " + key);
    }
    return descriptor.value;
}
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "symbol-registry", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function expectTrue(text: string, realm = fresh()): void {
    const result = run(text, realm);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        text,
    );
}
for (const source of [
    "Symbol.for('shared')===Symbol.for('shared')&&Symbol.for('shared')!==Symbol.for('other');",
    "Symbol.for('shared')!==Symbol('shared')&&Symbol.keyFor(Symbol('shared'))===undefined;",
    "Symbol.keyFor(Symbol.for('shared'))==='shared'&&Symbol.for('shared').description==='shared';",
    "Symbol.for()===Symbol.for(undefined)&&Symbol.keyFor(Symbol.for())==='undefined';",
    "Symbol.for(7)===Symbol.for('7')&&Symbol.for(null)===Symbol.for('null')&&Symbol.for(false)===Symbol.for('false');",
    "Symbol.for(-0)===Symbol.for(0)&&Symbol.keyFor(Symbol.for(NaN))==='NaN';",
    "Symbol.keyFor(Symbol.for(''))===''&&Symbol.for('')!==Symbol();",
    "Symbol.keyFor(Symbol.for('__proto__'))==='__proto__'&&Symbol.keyFor(Symbol.for('constructor'))==='constructor';",
    "let s=Symbol.for('Symbol.species');s!==Symbol.species&&Symbol.keyFor(Symbol.species)===undefined;",
    "let trace='';let k={toString:function(){trace+='S';return 'key';},valueOf:function(){throw 1;}};Symbol.for(k)===Symbol.for('key')&&trace==='S';",
    "let trace='';let k={toString:function(){trace+='S';return {};},valueOf:function(){trace+='V';return 7;}};Symbol.for(k)===Symbol.for('7')&&trace==='SV';",
    "let hint='';let k={};k[Symbol.toPrimitive]=function(h){hint=h;return 'key';};Symbol.for(k)===Symbol.for('key')&&hint==='string';",
    "let inner;let k={toString:function(){inner=Symbol.for('reentrant');return 'reentrant';}};Symbol.for(k)===inner;",
    "let marker={};try{Symbol.for({toString:function(){throw marker;}});}catch(e){e===marker;}",
    "let calls=0;let o={toString:function(){calls++;return 'x';},valueOf:function(){calls++;return Symbol.for('x');}};try{Symbol.keyFor(o);}catch(e){e instanceof TypeError&&calls===0;}",
    "let f=Symbol.for;let k=Symbol.keyFor;k.call(null,f.call(7,'detached'))==='detached';",
    "Symbol.for.length===1&&Symbol.for.name==='for'&&Symbol.keyFor.length===1&&Symbol.keyFor.name==='keyFor';",
    "let d=Object.getOwnPropertyDescriptor(Symbol,'for');d.writable&&!d.enumerable&&d.configurable;",
    "let d=Object.getOwnPropertyDescriptor(Symbol,'keyFor');d.writable&&!d.enumerable&&d.configurable;",
]) {
    expectTrue(source);
}
for (const source of [
    "Symbol.for(Symbol());",
    "Symbol.for(Object(Symbol()));",
    "Symbol.keyFor();",
    "Symbol.keyFor(null);",
    "Symbol.keyFor('x');",
    "Symbol.keyFor(1);",
    "Symbol.keyFor(Object(Symbol.for('x')));",
    "new Symbol.for('x');",
    "new Symbol.keyFor(Symbol());",
]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
for (const text of ["a\u0000\ud800", "\udfff", ""]) {
    const realm = fresh();
    seed(realm, "input", { kind: "string", value: text });
    expectTrue(
        "Symbol.keyFor(Symbol.for(input))===input&&Symbol.for(input).description===input;",
        realm,
    );
}
{
    const a = fresh(),
        b = fresh(),
        symbol = own(a.globalObject, "Symbol");
    if (symbol.kind !== "object") {
        throw new Error("Symbol object");
    }
    seed(b, "foreignFor", own(symbol.object, "for"));
    seed(b, "foreignKeyFor", own(symbol.object, "keyFor"));
    const first = run("Symbol.for('cross-realm');", a);
    if (first.type !== "normal") {
        throw new Error("first symbol");
    }
    seed(b, "first", first.value);
    expectTrue(
        "foreignFor!==Symbol.for&&foreignKeyFor!==Symbol.keyFor&&Symbol.for('cross-realm')===first&&foreignFor('cross-realm')===first&&foreignKeyFor(first)==='cross-realm';",
        b,
    );
    for (const source of ["foreignFor(Symbol());", "foreignKeyFor({});"]) {
        const result = run(source, b);
        check(
            result.type === "throw" &&
                result.value.kind === "object" &&
                result.value.object.getPrototypeOf() === a.getErrorPrototype("TypeError"),
            "registry error Realm",
        );
    }
}
for (const source of [
    "let i=0;while(true){Symbol.for('bounded'+i);i++;}",
    "let s=Symbol.for('bounded');while(true){Symbol.keyFor(s);}",
]) {
    const result = run(source, fresh(), 100);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "registry operation budget",
    );
}
check(!new Realm((_line: string) => {}).global.bindings.has("Symbol"), "legacy unchanged");
console.log("Symbol registry passed");
