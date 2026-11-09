import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { GuestObject, normal, sameValue, type Value, type ValueCompletion, type OperationContext, type PropertyKey, type InternalBooleanCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { wellKnownSpecies, wellKnownIsConcatSpreadable } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line:string)=>{},"script"); }
function num(value:number): Value { return {kind:"number",value}; }
function obj(object:GuestObject): Value { return {kind:"object",object}; }
function own(object:GuestObject,key:string): Value {
    const d=object.getOwnProperty(key);if(d===undefined||d.kind!=="data")throw new Error("own "+key);return d.value;
}
function data(object:GuestObject,key:string,value:Value): void {object.bootstrapDefine(key,{value,writable:true,enumerable:true,configurable:true});}
function run(realm:Realm,text:string,steps=100000): ValueCompletion {
    const prepared=prepareBoundedScript({id:"array-flat",text},realm);if(prepared.kind!=="ready")throw new Error("prepare flat: "+text);
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
function array(result:ValueCompletion): GuestObject {
    if(result.type!=="normal"||result.value.kind!=="object"||!(result.value.object instanceof GuestArray))throw new Error("flat array");return result.value.object;
}
for(const source of [
    "let nested=[1,2];let a=[nested,3];Object.defineProperty(nested,'0',{get:function(){a[1]=9;return 7;}});a.flat().join()==='7,2,9';",
    "let nested=[1,2];Object.defineProperty(nested,'0',{get:function(){nested.length=0;nested[2]=9;return 7;}});[nested].flat().join()==='7';",
    "[1,[2,[3]]].flat().join()==='1,2,3'&&[1,[2,[3]]].flat()[2][0]===3;",
    "[1,[2,[3]]].flat(2).join()==='1,2,3'&&[1,[2,[3]]].flat(Infinity)[2]===3;",
    "let nested=[2];let a=[1,nested];a.flat(0)[1]===nested&&a.flat(-1)[1]===nested&&a.flat(NaN)[1]===nested&&a.flat(null)[1]===nested&&a.flat(undefined)[1]===2;",
    "[1,[2,[3]]].flat(1.9)[2][0]===3;",
    "let a=[,1,,[2,,3]];let b=a.flat();b.join()==='1,2,3'&&b.length===3&&a.length===4;",
    "let a=[,1,,[2]];let b=a.flat(0);b.length===2&&b[0]===1&&b[1]===a[3];",
    "let o={0:2,length:1};let a=[o,'ab'];let b=a.flat(Infinity);b.length===2&&b[0]===o&&b[1]==='ab';",
    "[].flat.call({0:[1,2],2:3,length:3}).join()==='1,2,3'&&[].flat.call('ab').join()==='a,b';",
    "let calls=0;let a=[1,,3];let b=a.flatMap(function(v,i,o){calls++;if(o!==a)throw 1;return [v,i];});calls===2&&b.join()==='1,0,3,2';",
    "let b=[1,2].flatMap(function(v){return [[v]];});b.length===2&&b[0][0]===1&&b[1][0]===2;",
    "[1,2].flatMap(function(v){return [,v,,];}).join()==='1,2';",
    "let a=[1,2,3];let b=a.flatMap(function(v,i){if(i===0){delete a[1];a[2]=9;a.push(4);}return [v];});b.join()==='1,9';",
    "let o={0:7,length:1};[1].flatMap(function(){return o;})[0]===o;",
    "let marker={};try{[1].flat({valueOf:function(){throw marker;}});}catch(e){e===marker;}",
    "let marker={};try{[1].flatMap(function(){throw marker;});}catch(e){e===marker;}",
    "let marker={};let a={};Object.defineProperty(a,'length',{get:function(){throw marker;}});try{[].flatMap.call(a,0);}catch(e){e===marker;}"
]) {const result=run(fresh(),source);check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),source);}
class Observed extends GuestArray {
    trace="";
    internalHasProperty(key:PropertyKey,loc:Location): InternalBooleanCompletion {this.trace+="H"+(typeof key==="string"?key:"symbol")+";";return super.internalHasProperty(key,loc);}
    internalGet(key:PropertyKey,receiver:Value,context:OperationContext,loc:Location): ValueCompletion {this.trace+="G"+(typeof key==="string"?key:"symbol")+";";return super.internalGet(key,receiver,context,loc);}
}
{
    const realm=fresh(),nested=new Observed(realm.arrayPrototype),parent=realm.createArray();data(nested,"1",num(7));data(parent,"0",obj(nested));
    data(realm.arrayPrototype,"0",num(4));realm.defineScriptGlobal("input",{value:obj(parent)});
    const result=array(run(realm,"input.flat();"));
    check(nested.trace==="Glength;H0;G0;H1;G1;"&&sameValue(own(result,"0"),num(4))&&sameValue(own(result,"1"),num(7)),"nested length then sparse Has/Get and inherited value");
    nested.trace="";check(sameValue(own(array(run(realm,"input.flat(0);")),"0"),obj(nested))&&nested.trace==="","zero depth never reads nested length");
}
{
    const realm=fresh(),nested=realm.createArray(),parent=realm.createArray(),ordinary=realm.createObject();data(nested,"0",num(7));data(parent,"0",obj(nested));data(parent,"1",obj(ordinary));
    const poison=realm.createBuiltin("spread",0,(_receiver,_args,_context,_loc): ValueCompletion=>{throw new Error("flatten reads spreadability");});
    nested.bootstrapDefine(wellKnownIsConcatSpreadable,{get:obj(poison)});ordinary.bootstrapDefine(wellKnownIsConcatSpreadable,{get:obj(poison)});
    ordinary.bootstrapDefine("length",{get:obj(poison)});realm.defineScriptGlobal("input",{value:obj(parent)});
    const result=array(run(realm,"input.flat();"));check(sameValue(own(result,"0"),num(7))&&sameValue(own(result,"1"),obj(ordinary)),"flatten tests array identity only");
}
for(const method of ["flat","flatMap"]) {
    const owner=fresh(),caller=fresh(),callbackRealm=fresh(),input=caller.createArray(),thisArg=caller.createObject();data(input,"0",num(7));
    caller.defineScriptGlobal("input",{value:obj(input)});caller.defineScriptGlobal("method",{value:own(owner.arrayPrototype,method)});caller.defineScriptGlobal("self",{value:obj(thisArg)});
    const callback=callbackRealm.createBuiltin("mapper",3,(self,args,context,_loc): ValueCompletion=>{
        check(context.realm===callbackRealm&&sameValue(self,obj(thisArg))&&args.length===3&&sameValue(args[0],num(7))&&sameValue(args[1],num(0))&&sameValue(args[2],obj(input)),"flatMap callback Realm, receiver and tuple");
        const nested=callbackRealm.createArray();data(nested,"0",num(9));return normal(obj(nested));
    });caller.defineScriptGlobal("mapper",{value:obj(callback)});
    const result=array(run(caller,method==="flat"?"method.call(input);":"method.call(input,mapper,self);"));check(result.getPrototypeOf()===owner.arrayPrototype&&sameValue(own(result,"0"),num(method==="flat"?7:9)),"foreign default species and result Realm");
    const realm=fresh(),source=realm.createArray(),holder=realm.createObject();
    const custom=realm.createBuiltinConstructor("custom",0,(_receiver,_args,_context,_loc): ValueCompletion=>{throw new Error("species called");},(_callee,_newTarget,_args,_context,_loc): ValueCompletion=>{throw new Error("species constructed");});
    holder.bootstrapDefine(wellKnownSpecies,{value:obj(custom)});source.bootstrapDefine("constructor",{value:obj(holder)});realm.defineScriptGlobal("input",{value:obj(source)});
    const unsupported=run(realm,method==="flat"?"input.flat();":"input.flatMap(function(v){return v;});");
    check(unsupported.type==="throw"&&unsupported.origin.kind==="unsupported-operation"&&unsupported.origin.capabilityCode===(method==="flat"?"runtime.flat-species":"runtime.flatmap-species"),"custom species explicit even for empty input");
    if(method==="flatMap") {const invalid=run(realm,"input.flatMap(0);");check(invalid.type==="throw"&&invalid.origin.kind==="engine-diagnostic"&&invalid.diagnostic.name==="TypeError","callback validation before species");}
    const bounded=run(fresh(),method==="flat"?"[].flat.call({length:9007199254740991});":"[].flatMap.call({length:9007199254740991},function(v){return v;});",40);
    check(bounded.type==="throw"&&bounded.origin.kind==="resource-limit","huge sparse traversal bounded");
    check(new Realm((_line:string)=>{}).arrayPrototype.getOwnProperty(method)===undefined,"flatten Script only");
}
{
    const realm=fresh();let nested:Value=num(7);
    for(let i=0;i<5000;i++){const next=realm.createArray();data(next,"0",nested);nested=obj(next);}
    realm.defineScriptGlobal("input",{value:nested});check(sameValue(own(array(run(realm,"input.flat(Infinity);")),"0"),num(7)),"deep traversal uses explicit frames");
    const cycle=realm.createArray();data(cycle,"0",obj(cycle));realm.defineScriptGlobal("cycle",{value:obj(cycle)});
    const bounded=run(realm,"cycle.flat(Infinity);",100);check(bounded.type==="throw"&&bounded.origin.kind==="resource-limit","cyclic infinite-depth traversal bounded");
    check(sameValue(own(array(run(realm,"cycle.flat(2);")),"0"),obj(cycle)),"finite depth retains cyclic array identity");
}
{
    const realm=fresh();realm.arrayPrototype.bootstrapDefine("0",{set:obj(realm.createBuiltin("poison",1,(_receiver,_args,_context,_loc): ValueCompletion=>{throw new Error("flatten inherited setter");}))});
    check(sameValue(own(array(run(realm,"[[7]].flat();")),"0"),num(7)),"flatten defines own data bypassing inherited setter");
}
console.log("Array flattening passed");
