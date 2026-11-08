import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { GuestObject, normal, sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownSplit, wellKnownToPrimitive } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function obj(object: GuestObject): Value { return {kind:"object",object}; }
function str(value: string): Value { return {kind:"string",value}; }
function num(value: number): Value { return {kind:"number",value}; }
function own(object: GuestObject, key: string): Value {
    const d = object.getOwnProperty(key);
    if (d === undefined || d.kind !== "data") throw new Error("own " + key);
    return d.value;
}
function run(realm: Realm, text: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"string-split",text},realm);
    if (prepared.kind !== "ready") throw new Error("prepare split: " + text);
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
function array(result: ValueCompletion): GuestObject {
    if (result.type !== "normal" || result.value.kind !== "object" || !(result.value.object instanceof GuestArray)) throw new Error("split array");
    return result.value.object;
}
for (const source of [
    "'a,b,c'.split(',').join('|')==='a|b|c';",
    "',a,,'.split(',').join('|')==='|a||';",
    "'aaa'.split('aa').join('|')==='|a';",
    "'abc'.split('missing')[0]==='abc'&&'abc'.split()[0]==='abc';",
    "''.split('').length===0&&''.split(',').length===1&&''.split()[0]==='';",
    "'nullxnull'.split(null).join('|')==='|x|';",
    "'a,b,c'.split(',',2).join('|')==='a|b'&&'a,b'.split(',',0).length===0;",
    "'a,b,c'.split(',',-1).length===3&&'a,b,c'.split(',',4294967297).length===1;",
    "'a,b'.split(',',Infinity).length===0&&'a,b'.split(',',NaN).length===0&&'a,b'.split(',',null).length===0;",
    "'abcd'.split('',2.9).join('|')==='a|b';",
    "''.split.call(1232,2).join('|')==='1|3|';",
    "let marker={};try{'x'.split({toString:function(){throw marker;}},0);}catch(e){e===marker;}",
    "let marker={};try{'x'.split(',',{valueOf:function(){throw marker;}});}catch(e){e===marker;}",
    "let marker={};try{''.split.call({toString:function(){throw marker;}},',');}catch(e){e===marker;}"
]) {
    const result = run(fresh(),source);
    check(result.type === "normal" && sameValue(result.value,{kind:"boolean",value:true}),source);
}
{
    const realm = fresh();realm.defineScriptGlobal("input",{value:str("A😀\ud800")});
    const units = array(run(realm,"input.split('');"));
    check(sameValue(own(units,"length"),num(4)) && sameValue(own(units,"1"),str("\ud83d")) && sameValue(own(units,"2"),str("\ude00")) && sameValue(own(units,"3"),str("\ud800")),"split UTF-16 units");
    realm.defineScriptGlobal("separator",{value:str("\ude00")});
    const halves = array(run(realm,"input.split(separator);"));
    check(sameValue(own(halves,"0"),str("A\ud83d")) && sameValue(own(halves,"1"),str("\ud800")),"split at a trailing surrogate");
}
{
    const realm = fresh(), receiver = realm.createObject(), separator = realm.createObject(), limit = realm.createObject();let trace = "";
    for (const label of ["R","L","S"]) {
        const hook = realm.createBuiltin(label,1,(_receiver,args,_context,_loc): ValueCompletion => {
            trace += label;check(args[0].kind === "string" && args[0].value === (label === "L" ? "number" : "string"),"split coercion hints");
            return normal(label === "L" ? num(0) : str(label === "R" ? "a,b" : ","));
        });
        (label === "R" ? receiver : label === "L" ? limit : separator).bootstrapDefine(wellKnownToPrimitive,{value:obj(hook)});
    }
    separator.bootstrapDefine(wellKnownSplit,{get:obj(realm.createBuiltin("lookup",0,(_receiver,_args,_context,_loc): ValueCompletion => {trace += "G";return normal();}))});
    realm.defineScriptGlobal("input",{value:obj(receiver)});realm.defineScriptGlobal("separator",{value:obj(separator)});realm.defineScriptGlobal("limit",{value:obj(limit)});
    const result = array(run(realm,"''.split.call(input,separator,limit);"));
    check(trace === "GRLS" && sameValue(own(result,"length"),num(0)),"protocol before receiver, then limit, then separator even at zero limit");
    trace = "";const rejected = run(realm,"''.split.call(null,separator,limit);");
    check(rejected.type === "throw" && rejected.diagnostic.name === "TypeError" && trace === "","null receiver before protocol");
}
{
    const owner = fresh(), caller = fresh(), callbackRealm = fresh();
    const receiver = caller.createObject(), separator = caller.createObject(), limit = caller.createObject(), marker = callbackRealm.createObject();
    const poison = caller.createBuiltin("poison",1,(_receiver,_args,_context,_loc): ValueCompletion => {throw new Error("custom split coerced original argument");});
    receiver.bootstrapDefine(wellKnownToPrimitive,{value:obj(poison)});limit.bootstrapDefine(wellKnownToPrimitive,{value:obj(poison)});
    separator.bootstrapDefine(wellKnownSplit,{value:obj(callbackRealm.createBuiltin("splitter",2,(self,args,context,_loc): ValueCompletion => {
        check(context.realm === callbackRealm && sameValue(self,obj(separator)) && args.length === 2 && sameValue(args[0],obj(receiver)) && sameValue(args[1],obj(limit)),"custom split original arguments and Realm");return normal(obj(marker));
    })),configurable:true});
    caller.defineScriptGlobal("split",{value:own(owner.stringPrototype,"split")});caller.defineScriptGlobal("input",{value:obj(receiver)});caller.defineScriptGlobal("separator",{value:obj(separator)});caller.defineScriptGlobal("limit",{value:obj(limit)});
    const custom = run(caller,"split.call(input,separator,limit);");
    check(custom.type === "normal" && sameValue(custom.value,obj(marker)),"custom split returns arbitrary value unchanged");
    separator.bootstrapDefine(wellKnownSplit,{value:num(0),configurable:true});
    const invalid = run(caller,"split.call(input,separator,limit);");
    check(invalid.type === "throw" && invalid.diagnostic.name === "TypeError" && invalid.value.kind === "object" && invalid.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),"invalid protocol uses builtin Realm before coercion");
    const plain = array(run(caller,"split.call('a,b',',');"));
    check(plain.getPrototypeOf() === owner.arrayPrototype,"plain split result belongs to builtin Realm");
}
{
    const realm = fresh();let called = false;
    realm.stringPrototype.bootstrapDefine(wellKnownSplit,{get:obj(realm.createBuiltin("primitiveGetter",0,(self,_args,_context,_loc): ValueCompletion => {
        check(sameValue(self,str(",")),"primitive protocol getter receiver");called = true;return normal({kind:"null"});
    }))});
    const result = array(run(realm,"'a,b'.split(',');"));
    check(called && sameValue(own(result,"length"),num(2)),"primitive inherited protocol and null fallback");
}
{
    const realm = fresh(), separator = realm.createObject(), marker = realm.createObject();
    separator.bootstrapDefine(wellKnownSplit,{get:obj(realm.createBuiltin("thrower",0,(_receiver,_args,_context,loc): ValueCompletion => {
        return {type:"throw",value:obj(marker),diagnostic:{phase:"runtime",name:"Error",message:"marker",loc},origin:{kind:"guest"}};
    }))});realm.defineScriptGlobal("separator",{value:obj(separator)});
    const result = run(realm,"'x'.split(separator);");check(result.type === "throw" && sameValue(result.value,obj(marker)),"protocol getter throw identity");
}
{
    const realm = fresh();realm.arrayPrototype.bootstrapDefine("0",{set:obj(realm.createBuiltin("poison",1,(_receiver,_args,_context,_loc): ValueCompletion => {throw new Error("split inherited setter");}))});
    const result = array(run(realm,"'a,b'.split(',');"));const first = result.getOwnProperty("0");
    check(first !== undefined && first.kind === "data" && first.writable && first.enumerable && first.configurable && sameValue(first.value,str("a")),"split creates own data");
    realm.defineScriptGlobal("input",{value:str("a,".repeat(200))});
    for (const separator of ["''","','"]) {
        const bounded = run(realm,"input.split("+separator+");",40);
        check(bounded.type === "throw" && bounded.origin.kind === "resource-limit","split loop bounded");
    }
}
check(new Realm((_line:string)=>{}).stringPrototype.getOwnProperty("split") === undefined,"split Script only");
console.log("String split passed");

