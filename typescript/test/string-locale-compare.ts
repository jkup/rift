import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "string-locale-compare", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
for (const text of [
    'Object.is("abc".localeCompare("abc"),0)&&"abc".localeCompare("def")===-1&&"def".localeCompare("abc")===1',
    '"Å".localeCompare("A\\u030a")===0&&"Ω".localeCompare("Ω")===0',
    '"ṩ".localeCompare("s\\u0307\\u0323")===0&&"ḋ\\u0323".localeCompare("ḍ\\u0307")===0',
    '"가".localeCompare("가")===0&&"ﬃ".localeCompare("ffi")!==0',
    '"\\ud800".localeCompare("\\ud800")===0&&"\\udfff".localeCompare("\\ud800")===1&&"\\ufffd".localeCompare("𐀀")===1',
    '"".localeCompare("")===0&&"a".localeCompare("aa")===-1&&"undefined".localeCompare()===0',
    'String.prototype.localeCompare.call(123,123)===0&&new String("A").localeCompare(new String("B"))===-1',
    'var order=[];var receiver={[Symbol.toPrimitive](hint){order.push("r:"+hint);return "a"}};var other={[Symbol.toPrimitive](hint){order.push("o:"+hint);return "b"}};String.prototype.localeCompare.call(receiver,other)===-1&&order.join()==="r:string,o:string"',
    'var poison={get length(){throw 1},get toString(){throw 1},get [Symbol.iterator](){throw 1}};"a".localeCompare("b",poison,poison)===-1',
    'var marker={},caught;try{String.prototype.localeCompare.call({toString(){throw marker}},{toString(){throw 1}})}catch(e){caught=e}caught===marker',
    'var marker={},caught;try{"a".localeCompare({toString(){throw marker}})}catch(e){caught=e}caught===marker',
    'var count=0;for(var receiver of [null,undefined,Symbol()]){try{String.prototype.localeCompare.call(receiver,{toString(){throw 1}})}catch(e){if(e instanceof TypeError)count++}}try{"a".localeCompare(Symbol())}catch(e){if(e instanceof TypeError)count++}count===4',
    'String.prototype.normalize=function(){throw 1};"Å".localeCompare("A\\u030a")===0',
    'var ordered=["","A","B","Å","Ω","𐀀","\\ufffd"],ok=true;for(var i=0;i<ordered.length;i++){for(var j=0;j<ordered.length;j++){var expected=i===j?0:i<j?-1:1;if(ordered[i].localeCompare(ordered[j])!==expected)ok=false}}ok',
    'var f=String.prototype.localeCompare,d=Object.getOwnPropertyDescriptor(String.prototype,"localeCompare");f.name==="localeCompare"&&f.length===1&&d.writable&&!d.enumerable&&d.configurable&&!Object.hasOwn(f,"prototype")',
    'var caught=false;try{new String.prototype.localeCompare()}catch(e){caught=e instanceof TypeError}caught',
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
const method = run("String.prototype.localeCompare", owner);
if (method.type !== "normal") throw new Error("method");
caller.defineScriptGlobal("compare", { value: method.value });
const result = run("compare.call(null)", caller);
check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "defining Realm error");
console.log("string locale compare passed");
