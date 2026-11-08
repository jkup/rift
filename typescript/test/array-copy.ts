import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { GuestObject, normal, sameValue, type Value, type ValueCompletion, type OperationContext, type PropertyKey, type InternalBooleanCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { wellKnownSpecies } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function obj(object: GuestObject): Value { return {kind:"object",object}; }
function num(value: number): Value { return {kind:"number",value}; }
function own(object: GuestObject, key: string): Value {
    const d = object.getOwnProperty(key);
    if (d === undefined || d.kind !== "data") throw new Error("own " + key);
    return d.value;
}
function data(object: GuestObject, key: string, value: number): void {
    object.bootstrapDefine(key,{value:num(value),writable:true,enumerable:true,configurable:true});
}
function run(realm: Realm, text: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"array-copy",text},realm);
    if(prepared.kind !== "ready")throw new Error("prepare copy");
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
function array(completion: ValueCompletion): GuestObject {
    if(completion.type !== "normal" || completion.value.kind !== "object" || !(completion.value.object instanceof GuestArray))throw new Error("array result");
    return completion.value.object;
}
class Observed extends GuestObject {
    trace = "";
    internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion {
        this.trace += "has:" + key + ";";
        return super.internalHasProperty(key,loc);
    }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, loc: Location): ValueCompletion {
        this.trace += "get:" + key + ";";
        return super.internalGet(key,receiver,context,loc);
    }
}
{
    const realm = fresh(), target = new Observed(realm.objectPrototype);
    data(target,"length",4.9); data(target,"1",11); data(realm.objectPrototype,"3",13);
    realm.defineScriptGlobal("target",{value:obj(target)});
    const result = array(run(realm,"[].slice.call(target,1,4);"));
    check(target.trace === "get:length;has:1;get:1;has:2;has:3;get:3;","slice Has/Get order");
    check(sameValue(own(result,"length"),num(3)) && sameValue(own(result,"0"),num(11)) && result.getOwnProperty("1") === undefined && sameValue(own(result,"2"),num(13)),"slice holes and inherited values");
    check(sameValue(own(target,"length"),num(4.9)) && target.getOwnProperty("3") === undefined,"slice does not mutate source");
}
{
    const realm = fresh(), target = new Observed(realm.objectPrototype);
    data(target,"length",3); data(target,"1",11);
    target.bootstrapDefine("0",{get:obj(realm.createBuiltin("first",0,(_receiver,_args,_context,_loc): ValueCompletion => {
        data(target,"length",0); data(target,"2",17); target.internalDelete("1"); return normal(num(7));
    })),configurable:true});
    realm.defineScriptGlobal("target",{value:obj(target)});
    const result = array(run(realm,"[].slice.call(target);"));
    check(sameValue(own(result,"length"),num(3)) && sameValue(own(result,"0"),num(7)) && result.getOwnProperty("1") === undefined && sameValue(own(result,"2"),num(17)),"captured length and live property observations");
}
{
    const owner = fresh(), caller = fresh(), input = caller.createArray();
    data(input,"1",7);
    caller.defineScriptGlobal("input",{value:obj(input)});
    caller.defineScriptGlobal("slice",{value:own(owner.arrayPrototype,"slice")});
    const result = array(run(caller,"slice.call(input,0,2);"));
    check(result.getPrototypeOf() === owner.arrayPrototype && result !== input && result.getOwnProperty("0") === undefined && sameValue(own(result,"1"),num(7)),"foreign intrinsic slice result Realm");
    check(sameValue(own(input,"length"),num(2)),"foreign source unchanged");
}
{
    const realm = fresh(), input = realm.createArray(), holder = realm.createObject();
    data(input,"0",7); input.bootstrapDefine("constructor",{value:obj(holder)});
    const custom = realm.createBuiltinConstructor("custom",1,
        (_receiver,_args,_context,_loc): ValueCompletion => {throw new Error("species call");},
        (_callee,_args,_context,_loc): ValueCompletion => {throw new Error("species construct");});
    holder.bootstrapDefine(wellKnownSpecies,{value:obj(custom),configurable:true});
    realm.defineScriptGlobal("input",{value:obj(input)});
    const result = run(realm,"input.slice(0,0);");
    check(result.type === "throw" && result.origin.kind === "unsupported-operation" && result.origin.capabilityCode === "runtime.slice-species","custom species checked even for empty slice");
    holder.bootstrapDefine(wellKnownSpecies,{value:num(1),configurable:true});
    const invalid = run(realm,"input.slice();");
    check(invalid.type === "throw" && invalid.origin.kind === "engine-diagnostic" && invalid.diagnostic.name === "TypeError","invalid slice species TypeError");
    holder.bootstrapDefine(wellKnownSpecies,{value:{kind:"null"},configurable:true});
    check(sameValue(own(array(run(realm,"input.slice();")),"0"),num(7)),"null species defaults");
}
{
    const realm = fresh();
    realm.arrayPrototype.bootstrapDefine("0",{set:obj(realm.createBuiltin("setter",1,(_receiver,_args,_context,_loc): ValueCompletion => {throw new Error("inherited result setter");})),configurable:true});
    const result = array(run(realm,"[].slice.call({0:7,length:1});"));
    const d = result.getOwnProperty("0");
    check(d !== undefined && d.kind === "data" && sameValue(d.value,num(7)) && d.writable && d.enumerable && d.configurable,"slice defines own data bypassing inherited setters");
}
{
    const result = array(run(fresh(),"[].slice.call({9007199254740990:7,length:9007199254740991},-1);"));
    check(sameValue(own(result,"0"),num(7)) && sameValue(own(result,"length"),num(1)),"safe integer indices");
    const range = run(fresh(),"[].slice.call({length:4294967296});");
    check(range.type === "throw" && range.diagnostic.name === "RangeError","result array limit");
    const bounded = run(fresh(),"[].slice.call({length:4294967295});",40);
    check(bounded.type === "throw" && bounded.origin.kind === "resource-limit" && bounded.origin.guardCode === "steps","huge holes bounded");
    check(sameValue(own(array(run(fresh(),"[].slice.call({length:9007199254740991},Infinity);")),"length"),num(0)),"empty huge slice constant work");
}
for (const source of ["let marker={};let input={};Object.defineProperty(input,'length',{get:function(){throw marker;}});try{[].slice.call(input);}catch(e){e===marker;}","let marker={};try{[1].slice({valueOf:function(){throw marker;}});}catch(e){e===marker;}","let marker={};try{[1].slice(0,{valueOf:function(){throw marker;}});}catch(e){e===marker;}","let marker={};let input={length:1};Object.defineProperty(input,'0',{get:function(){throw marker;}});try{[].slice.call(input);}catch(e){e===marker;}"]) {
    const completion = run(fresh(),source);
    check(completion.type === "normal" && sameValue(completion.value,{kind:"boolean",value:true}),"slice exact throw identity");
}
const legacy = new Realm((_line: string) => {});
check(legacy.arrayPrototype.getOwnProperty("slice") === undefined,"slice Script only");
console.log("Array copy passed");
