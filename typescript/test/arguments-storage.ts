import { GuestArguments, createArgumentsObject } from "../src/arguments-object.js";
import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import type { ScriptBindingCell } from "../src/script-environment.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function number(value: number): Value { return { kind: "number", value }; }
function run(realm: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "arguments-storage", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function passes(realm: Realm, text: string): void {
    const result = run(realm, text);
    check(result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }), text);
}
function fixture(): { realm: Realm; object: GuestArguments; cell: ScriptBindingCell } {
    const realm = new Realm((_line: string) => {}, "script");
    const object = new GuestArguments(realm.objectPrototype);
    const cell: ScriptBindingCell = { initialized: true, mutable: true, value: number(1) };
    object.bootstrapDefine("0", { value: number(1), writable: true, enumerable: true, configurable: true });
    object.bootstrapDefine("1", { value: number(2), writable: true, enumerable: true, configurable: true });
    object.bootstrapDefine("length", { value: number(2), writable: true, configurable: true });
    object.mapParameter("0", cell);
    realm.defineScriptGlobal("input", { value: { kind: "object", object } });
    return { realm, object, cell };
}

{
    const f = fixture();
    f.cell.value = number(7);
    passes(f.realm, "input[0]===7&&Object.getOwnPropertyDescriptor(input,'0').value===7&&input[1]===2;");
    passes(f.realm, "input[0]=8;input[0]===8;");
    check(sameValue(f.cell.value, number(8)), "assignment updates parameter");
    const detached = f.object.getOwnProperty("0");
    if (detached === undefined || detached.kind !== "data") throw new Error("descriptor");
    detached.value = number(99);
    passes(f.realm, "input[0]===8;");
    passes(f.realm, "Object.defineProperty(input,'0',{value:9});input[0]===9;");
    check(sameValue(f.cell.value, number(9)), "definition updates parameter");
    passes(f.realm, "input[4]=5;input.length===2&&Object.keys(input).join(',')==='0,1,4'&&!Array.isArray(input);");
}
{
    const f = fixture();
    passes(f.realm, "delete input[0];!Object.hasOwn(input,'0');");
    f.cell.value = number(7);
    passes(f.realm, "input[0]=8;input[0]===8;");
    check(sameValue(f.cell.value, number(7)), "delete permanently disconnects mapping");
}
{
    const f = fixture();
    f.cell.value = number(7);
    passes(f.realm, "Object.defineProperty(input,'0',{writable:false});input[0]===7;");
    f.cell.value = number(8);
    passes(f.realm, "input[0]=9;input[0]===7&&!Object.getOwnPropertyDescriptor(input,'0').writable;");
    check(sameValue(f.cell.value, number(8)), "non-writable snapshot disconnects mapping");
}
{
    const f = fixture();
    passes(f.realm, "Object.defineProperty(input,'0',{value:7,writable:false});input[0]===7;");
    check(sameValue(f.cell.value, number(7)), "final value copied before disconnect");
    f.cell.value = number(8);
    passes(f.realm, "input[0]===7;");
}
{
    const f = fixture();
    passes(f.realm, "Object.defineProperty(input,'0',{get:function(){return 9;}});input[0]===9;");
    f.cell.value = number(7);
    passes(f.realm, "Object.defineProperty(input,'0',{value:8,writable:true});input[0]=10;input[0]===10;");
    check(sameValue(f.cell.value, number(7)), "accessor conversion permanently disconnects mapping");
}
{
    const f = fixture();
    passes(f.realm, "Object.seal(input);Object.isSealed(input)&&!Object.isFrozen(input)&&!(delete input[0]);");
    f.cell.value = number(7);
    passes(f.realm, "var caught=false;try{Object.defineProperty(input,'0',{get:function(){return 0;}});}catch(e){caught=e instanceof TypeError;}caught&&input[0]===7;");
    passes(f.realm, "input[0]=8;input[0]===8;");
    check(sameValue(f.cell.value, number(8)), "failed delete and definition retain mapping");
    passes(f.realm, "Object.freeze(input);Object.isFrozen(input)&&input[0]===8;");
    f.cell.value = number(9);
    passes(f.realm, "input[0]===8;");
}
{
    const f = fixture();
    passes(f.realm, "var child=Object.create(input);child[0]=7;child[0]===7&&input[0]===1;");
    check(sameValue(f.cell.value, number(1)), "alternate receiver leaves parameter untouched");
    f.cell.value = number(8);
    passes(f.realm, "var other=Object.create(input);other[0]===8&&Object.getOwnPropertyDescriptor(other,'0')===undefined;");
}
for (const mapped of [false, true]) {
    const realm = new Realm((_line: string) => {}, "script");
    const cell: ScriptBindingCell = { initialized: true, mutable: true, value: number(1) };
    const make = realm.createBuiltin("make", 0, (_receiver, args, context, loc): ValueCompletion =>
        createArgumentsObject(realm, args, mapped ? realm.functionPrototype : null, mapped ? [cell] : [], context, loc));
    realm.defineScriptGlobal("make", { value: { kind: "object", object: make } });
    passes(realm, "var originalValues=Array.prototype.values;var originalThrower=Object.getOwnPropertyDescriptor(Function.prototype,'caller').get;Array.prototype.values=function(){throw 1;};Array.prototype[Symbol.iterator]=function(){throw 2;};Object.defineProperty(Function.prototype,'caller',{value:3});var input=make(1,2);input.length===2&&Object.getPrototypeOf(input)===Object.prototype&&!Array.isArray(input)&&Object.prototype.toString.call(input)==='[object Arguments]';");
    passes(realm, "var iterated='';for(var value of input){iterated+=value;}input[Symbol.iterator]===originalValues&&iterated==='12'&&Object.keys(input).join(',')==='0,1';");
    passes(realm, "var d=Object.getOwnPropertyDescriptor(input,'length');d.value===2&&d.writable&&!d.enumerable&&d.configurable;");
    if (mapped) {
        passes(realm, "var c=Object.getOwnPropertyDescriptor(input,'callee');c.value===Function.prototype&&c.writable&&!c.enumerable&&c.configurable;");
        cell.value = number(7);
        passes(realm, "input[0]===7;");
    } else {
        passes(realm, "var c=Object.getOwnPropertyDescriptor(input,'callee');c.get===originalThrower&&c.set===originalThrower&&!c.enumerable&&!c.configurable;");
        passes(realm, "var failures=0;try{input.callee;}catch(e){if(e instanceof TypeError)failures++;}try{input.callee=1;}catch(e){if(e instanceof TypeError)failures++;}failures===2;");
        cell.value = number(7);
        passes(realm, "input[0]===1;");
    }
    passes(realm, "input[Symbol.toStringTag]='Custom';Object.prototype.toString.call(input)==='[object Custom]';");
    const limited = run(realm, "make(1,2,3,4,5,6,7,8);", 12);
    check(limited.type === "throw" && limited.origin.kind === "resource-limit", "bounded arguments allocation");
}
console.log("Arguments storage passed");
