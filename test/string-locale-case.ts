import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "string-locale-case", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
for (const text of [
    '"HELLO".toLocaleLowerCase()==="hello"&&"hello".toLocaleUpperCase()==="HELLO"',
    '"Straße".toLocaleUpperCase()==="STRASSE"&&"ΟΣ".toLocaleLowerCase()==="ος"',
    '"İ".toLocaleLowerCase()==="i\\u0307"&&"ﬃ".toLocaleUpperCase()==="FFI"',
    '"𐐀".toLocaleLowerCase()==="𐐨"&&"𐐨".toLocaleUpperCase()==="𐐀"',
    '"\\ud800A\\udfff".toLocaleLowerCase()==="\\ud800a\\udfff"&&"".toLocaleUpperCase()===""',
    '"I".toLocaleLowerCase("tr")==="i"&&"i".toLocaleUpperCase("tr")==="I"',
    'var poison={get length(){throw 42},get toString(){throw 42},get [Symbol.iterator](){throw 42}};"A".toLocaleLowerCase(poison,poison)==="a"',
    'String.prototype.toLocaleLowerCase.call(123)==="123"&&String.prototype.toLocaleUpperCase.call(true)==="TRUE"',
    'new String("Ab").toLocaleLowerCase()==="ab"&&String.prototype.toLocaleUpperCase()===""',
    'var seen=[];var value={[Symbol.toPrimitive](hint){seen.push(hint);return "Ab"},toString(){throw 42}};String.prototype.toLocaleLowerCase.call(value)==="ab"&&seen.join() === "string"',
    'var seen=[];var value={toString(){seen.push("string");return {}},valueOf(){seen.push("value");return "Ab"}};String.prototype.toLocaleUpperCase.call(value)==="AB"&&seen.join()==="string,value"',
    'var marker={};var caught;try{String.prototype.toLocaleLowerCase.call({toString(){throw marker}})}catch(e){caught=e}caught===marker',
    'var original=String.prototype.toLowerCase;String.prototype.toLowerCase=function(){throw 42};"ABC".toLocaleLowerCase()==="abc"',
    'String.prototype.toLowerCase!==String.prototype.toLocaleLowerCase&&String.prototype.toUpperCase!==String.prototype.toLocaleUpperCase',
    'var names=["toLocaleLowerCase","toLocaleUpperCase"];names.every(name=>{var f=String.prototype[name],d=Object.getOwnPropertyDescriptor(String.prototype,name);return f.name===name&&f.length===0&&d.writable&&!d.enumerable&&d.configurable&&!Object.hasOwn(f,"prototype")})',
    'var ok=0;for(var method of [String.prototype.toLocaleLowerCase,String.prototype.toLocaleUpperCase]){for(var value of [null,undefined,Symbol()]){try{method.call(value)}catch(e){if(e instanceof TypeError)ok++}}try{new method()}catch(e){if(e instanceof TypeError)ok++}}ok===8',
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
const lower = run("String.prototype.toLocaleLowerCase", owner);
if (lower.type !== "normal") throw new Error("method");
caller.defineScriptGlobal("lower", { value: lower.value });
const error = run("lower.call(null)", caller);
check(error.type === "throw" && error.value.kind === "object" && error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "defining Realm error");
console.log("string locale case passed");
