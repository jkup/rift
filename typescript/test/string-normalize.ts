import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "string-normalize", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
for (const text of [
    '"A\\u030a".normalize()==="Å"&&"A\\u030a".normalize(undefined)==="Å"',
    '"Å".normalize("NFD")==="A\\u030a"&&"Ω".normalize("NFC")==="Ω"',
    '"ṩ".normalize("NFD")==="s\\u0323\\u0307"&&"s\\u0307\\u0323".normalize("NFD")==="s\\u0323\\u0307"',
    '"ḋ\\u0323".normalize("NFC")==="ḍ\\u0307".normalize("NFC")',
    '"가".normalize("NFC")==="가"&&"가".normalize("NFD")==="가"',
    '"ﬃ".normalize("NFKC")==="ffi"&&"ﬃ".normalize("NFKD")==="ffi"&&"ﬃ".normalize("NFC")==="ﬃ"',
    '"\\ud800x\\udfff".normalize()==="\\ud800x\\udfff"&&"".normalize("NFKD")===""',
    'String.prototype.normalize.call(123)==="123"&&new String("A\\u030a").normalize(new String("NFC"))==="Å"',
    'var order=[];var receiver={[Symbol.toPrimitive](hint){order.push("r:"+hint);return "Å"}};var form={[Symbol.toPrimitive](hint){order.push("f:"+hint);return "NFD"}};String.prototype.normalize.call(receiver,form)==="A\\u030a"&&order.join()==="r:string,f:string"',
    'var marker={},caught;try{String.prototype.normalize.call({toString(){throw marker}},{toString(){throw 1}})}catch(e){caught=e}caught===marker',
    'var marker={},caught;try{"x".normalize({toString(){throw marker}})}catch(e){caught=e}caught===marker',
    'var count=0;for(var form of ["nfc","","NFC ",null,1,{}, {toString(){return undefined}}]){try{"".normalize(form)}catch(e){if(e instanceof RangeError)count++}}count===7',
    'var count=0;for(var receiver of [null,undefined,Symbol()]){try{String.prototype.normalize.call(receiver,{toString(){throw 1}})}catch(e){if(e instanceof TypeError)count++}}try{"x".normalize(Symbol())}catch(e){if(e instanceof TypeError)count++}count===4',
    '"Å".normalize("NFD",{get toString(){throw 1}})==="A\\u030a"',
    'var f=String.prototype.normalize,d=Object.getOwnPropertyDescriptor(String.prototype,"normalize");f.name==="normalize"&&f.length===0&&d.writable&&!d.enumerable&&d.configurable&&!Object.hasOwn(f,"prototype")',
    'var caught=false;try{new String.prototype.normalize()}catch(e){caught=e instanceof TypeError}caught',
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
const method = run("String.prototype.normalize", owner);
if (method.type !== "normal") throw new Error("method");
caller.defineScriptGlobal("normalize", { value: method.value });
for (const name of ["TypeError", "RangeError"] as const) {
    const result = run(name === "TypeError" ? "normalize.call(null)" : 'normalize.call("x","bad")', caller);
    check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === owner.getErrorPrototype(name), "defining Realm " + name);
}
console.log("string normalize passed");
