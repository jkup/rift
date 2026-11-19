import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { GuestObject, normal, sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function num(value: number): Value { return { kind: "number", value }; }
function str(value: string): Value { return { kind: "string", value }; }
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("own " + key);
    return descriptor.value;
}
function run(realm: Realm, source: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "json", text: source }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare JSON test");
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const completion = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "JSON restores session");
    return completion;
}
function parse(text: string, steps = 100000): ValueCompletion {
    const realm = fresh();
    realm.defineScriptGlobal("input", { value: str(text) });
    return run(realm, "JSON.parse(input);", steps);
}
const texts = ["null", "true", "false", "0", "-0", "-0.0e+2", "1.25", "-12.5e-2", "1e400", "-1e400", "1e-400", '"hello"', '"\\uD800\\u0061\\uDC00"', '"\\b\\f\\n\\r\\t\\/\\\\\\\""', '"\u2028\u2029"'];
const values: Value[] = [{kind:"null"}, {kind:"boolean",value:true}, {kind:"boolean",value:false}, num(0), num(-0), num(-0), num(1.25), num(-0.125), num(Infinity), num(-Infinity), num(0), str("hello"), str("\ud800a\udc00"), str('\b\f\n\r\t/\\"'), str("\u2028\u2029")];
for (let i = 0; i < texts.length; i++) {
    const actual = parse(" \t\r\n" + texts[i] + " \n");
    check(actual.type === "normal" && sameValue(actual.value, values[i]), "JSON primitive " + i);
}
for (const text of ["", " ", "undefined", "NaN", "Infinity", "+1", "01", "-01", ".1", "1.", "1e", "1e+", "1e-", "0x1", "0b1", "1_0", "1n", "true false", "nullx", "True", "[", "{", "[1,]", "[,1]", "[1,,2]", "{a:1}", "{'a':1}", '{"a" 1}', '{"a":}', '{"a":1,}', '{"a":1 "b":2}', "[1}", "[1]x", "/*x*/0", "0//x", "\u00a00", "\ufeff0", '"x\ny"', '"x\ty"', '"\u0000"', '"\\v"', '"\\x41"', '"\\0"', '"\\u{41}"', '"\\u123"', '"\\u12xz"', '"\\', '"unterminated']) {
    const actual = parse(text);
    check(actual.type === "throw" && actual.diagnostic.name === "SyntaxError" && actual.origin.kind === "engine-diagnostic", "invalid JSON " + text);
}
{
    const realm = fresh();
    const json = own(realm.globalObject,"JSON");
    check(json.kind === "object" && json.object.callable === null && json.object.constructorSlot === null && json.object.getPrototypeOf() === realm.objectPrototype,"JSON namespace");
    if (json.kind !== "object") throw new Error("namespace");
    const tag = json.object.getOwnProperty(wellKnownToStringTag);
    check(tag !== undefined && tag.kind === "data" && sameValue(tag.value,str("JSON")) && !tag.writable && !tag.enumerable && tag.configurable,"JSON tag");
    const completion = run(realm, 'JSON.parse(\'{"__proto__":{"safe":1},"a":1,"b":[null,{"z":2}],"a":3}\');');
    check(completion.type === "normal" && completion.value.kind === "object", "JSON object result");
    if (completion.type !== "normal" || completion.value.kind !== "object") throw new Error("JSON object");
    const object = completion.value.object;
    const keys = object.ownPropertyKeys();
    check(object.getPrototypeOf() === realm.objectPrototype && keys.length === 3 && keys[0] === "__proto__" && keys[1] === "a" && keys[2] === "b", "JSON duplicate order and prototype");
    check(sameValue(own(object,"a"),num(3)), "duplicate last value");
    const descriptor = object.getOwnProperty("__proto__");
    check(descriptor !== undefined && descriptor.kind === "data" && descriptor.writable && descriptor.enumerable && descriptor.configurable,"proto ordinary data");
    const array = own(object,"b");
    check(array.kind === "object" && array.object instanceof GuestArray && array.object.getPrototypeOf() === realm.arrayPrototype && sameValue(own(array.object,"length"),num(2)),"nested JSON array");
}
{
    const owner = fresh(), caller = fresh();
    const namespace = own(owner.globalObject,"JSON");
    if (namespace.kind !== "object") throw new Error("JSON owner");
    caller.defineScriptGlobal("parse",{value:own(namespace.object,"parse")});
    const input = caller.createObject(); let conversions = 0;
    input.bootstrapDefine(wellKnownToPrimitive,{value:obj(caller.createBuiltin("convert",1,(receiver,args,context,_loc): ValueCompletion => {
        check(sameValue(receiver,obj(input)) && context.realm === caller && sameValue(args[0],str("string")),"JSON string hint and conversion Realm");
        conversions++; return normal(str('[{"x":1}]'));
    }))});
    caller.defineScriptGlobal("input",{value:obj(input)});
    const completion = run(caller,"parse.call(null,input,7);");
    check(completion.type === "normal" && completion.value.kind === "object" && completion.value.object.getPrototypeOf() === owner.arrayPrototype && conversions === 1,"JSON foreign result ownership and one conversion");
    if(completion.type !== "normal" || completion.value.kind !== "object")throw new Error("foreign JSON");
    const child = own(completion.value.object,"0");
    check(child.kind === "object" && child.object.getPrototypeOf() === owner.objectPrototype,"nested foreign JSON ownership");
}
{
    const realm = fresh();
    const thrown = run(realm,"let marker={};try{JSON.parse({toString:function(){throw marker;}});}catch(e){e===marker;}");
    check(thrown.type === "normal" && sameValue(thrown.value,{kind:"boolean",value:true}),"JSON conversion throw identity");
    const reviver = run(fresh(),"JSON.parse('0',function(){throw 9;});");
    check(reviver.type === "throw" && reviver.value.kind === "number" && reviver.value.value === 9,"reviver throw identity");
    const malformed = run(fresh(),"JSON.parse('[',function(){});");
    check(malformed.type === "throw" && malformed.origin.kind === "engine-diagnostic" && malformed.diagnostic.name === "SyntaxError","syntax precedes reviver");
}
for (const text of ['"' + "a".repeat(2000) + '"', " ".repeat(2000) + "0", "1".repeat(2000), "[" + "0,".repeat(1000) + "0]", "[".repeat(1000) + "0" + "]".repeat(1000)]) {
    const bounded = parse(text, 50);
    check(bounded.type === "throw" && bounded.origin.kind === "resource-limit" && bounded.origin.guardCode === "steps","JSON scanning and nesting bounded");
    check(parse(text).type === "normal","large JSON completion");
}
const legacy = new Realm((_line: string) => {});
check(!legacy.global.bindings.has("JSON"),"JSON Script only");
console.log("JSON parse passed");
