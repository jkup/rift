import { Realm } from "../src/realm.js";
import { GuestNumber } from "../src/primitive-objects.js";
import { GuestObject, normal, sameValue, UNDEFINED, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok:boolean,label:string): void {if(!ok)throw new Error(label);}
function fresh(): Realm {return new Realm((_line:string)=>{},"script");}
function num(value:number): Value {return {kind:"number",value};}
function obj(object:GuestObject): Value {return {kind:"object",object};}
function own(object:GuestObject,key:string): Value {const d=object.getOwnProperty(key);if(d===undefined||d.kind!=="data")throw new Error("own "+key);return d.value;}
function seed(realm:Realm,name:string,value:Value): void {realm.defineScriptGlobal(name,{value,writable:true,configurable:true});}
function run(realm:Realm,text:string,steps=10000): ValueCompletion {
    const prepared=prepareBoundedScript({id:"number-constructor",text},realm);if(prepared.kind!=="ready")throw new Error("prepare Number");
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
function primitive(result:ValueCompletion,expected:number): void {check(result.type==="normal"&&sameValue(result.value,num(expected)),"Number primitive");}
function boxed(result:ValueCompletion,expected:number,prototype:GuestObject): void {
    if(result.type!=="normal"||result.value.kind!=="object")throw new Error("Number wrapper");const object=result.value.object;
    check(object instanceof GuestNumber&&sameValue(num(object.numberData),num(expected))&&object.getPrototypeOf()===prototype&&object.ownPropertyKeys().length===0,"Number slot and prototype");
}
const realm=fresh();
const inputs:Value[]=[UNDEFINED,{kind:"null"},{kind:"boolean",value:true},{kind:"boolean",value:false},num(-0),num(NaN),num(Infinity),{kind:"string",value:""},{kind:"string",value:" 0x10 "},{kind:"string",value:"-0"},{kind:"string",value:"12junk"},obj(realm.createNumberObject(7)),obj(realm.createArray())];
const expected=[NaN,0,1,0,-0,NaN,Infinity,0,16,-0,NaN,7,0];
for(let i=0;i<inputs.length;i++){seed(realm,"input",inputs[i]);primitive(run(realm,"Number(input);"),expected[i]);boxed(run(realm,"new Number(input);"),expected[i],realm.numberPrototype);}
primitive(run(realm,"Number();"),0);boxed(run(realm,"new Number();"),0,realm.numberPrototype);
for(const source of [
    "typeof Number==='function'&&Number.length===1&&Number.name==='Number'&&Number.prototype.constructor===Number;",
    "Number.prototype.valueOf()===0&&new Number(7).valueOf()===7&&new Number(15).toString(16)==='f';",
    "Number.isInteger(-0)&&Number.isInteger(9007199254740992)&&Number.isInteger(1e100)&&!Number.isInteger(1.5)&&!Number.isInteger(Infinity)&&!Number.isInteger(NaN);",
    "Number.isSafeInteger(-0)&&Number.isSafeInteger(9007199254740991)&&Number.isSafeInteger(-9007199254740991)&&!Number.isSafeInteger(9007199254740992)&&!Number.isSafeInteger(1e100);",
    "!Number.isInteger('1')&&!Number.isInteger(new Number(1))&&!Number.isInteger()&&!Number.isSafeInteger(null)&&!Number.isSafeInteger(true);",
    "let x={valueOf:function(){throw 1;}};Number(7,x)===7&&!Number.isInteger(x)&&!Number.isSafeInteger(x);",
    "let order='';let x={valueOf:function(){order+='V';return {};},toString:function(){order+='S';return '9';}};Number(x)===9&&order==='VS';",
    "let marker={};try{new Number({valueOf:function(){throw marker;}});}catch(e){e===marker;}",
    "let marker={};try{Number({valueOf:function(){throw marker;}});}catch(e){e===marker;}"
]){const result=run(fresh(),source);check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),source);}
{
    const owner=fresh(),caller=fresh(),constructor=own(owner.globalObject,"Number");seed(caller,"ForeignNumber",constructor);
    boxed(run(caller,"new ForeignNumber(7);"),7,owner.numberPrototype);primitive(run(caller,"ForeignNumber('8');"),8);
    seed(caller,"symbol",{kind:"symbol",value:wellKnownToPrimitive});
    for(const source of ["ForeignNumber(symbol);","new ForeignNumber(symbol);"]){const result=run(caller,source);check(result.type==="throw"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===owner.getErrorPrototype("TypeError"),"Number conversion error Realm");}
}
{
    const r=fresh(),input=r.createObject();let calls=0;
    input.bootstrapDefine(wellKnownToPrimitive,{value:obj(r.createBuiltin("convert",1,(_receiver,args,_context,_loc): ValueCompletion=>{
        check(args[0].kind==="string"&&args[0].value==="number","Number numeric hint");calls++;return normal(num(7));
    }))});seed(r,"input",obj(input));
    primitive(run(r,"Number(input);"),7);boxed(run(r,"new Number(input);"),7,r.numberPrototype);check(calls===2,"Number converts each input once");
}
{
    const r=fresh(),original=r.createNumberObject(-0);original.setPrototypeOf(null);seed(r,"input",obj(original));
    primitive(run(r,"Number.prototype.valueOf.call(input);"),-0);
    seed(r,"fake",obj(r.createObject()));const result=run(r,"Number.prototype.valueOf.call(fake);");check(result.type==="throw"&&result.diagnostic.name==="TypeError","Number slot cannot be forged");
}
{
    let interrupted=false,completed=false;
    for(let steps=0;steps<40;steps++){
        const r=fresh(),input=r.createObject();let calls=0;input.bootstrapDefine("valueOf",{value:obj(r.createBuiltin("convert",0,(_receiver,_args,_context,_loc): ValueCompletion=>{calls++;return normal(num(7));}))});seed(r,"input",obj(input));
        const result=run(r,"new Number(input);",steps);
        if(result.type==="throw"){check(result.origin.kind==="resource-limit","Number construction budget");if(calls===1)interrupted=true;}
        else{boxed(result,7,r.numberPrototype);completed=true;}check(calls<=1,"Number converts once");
    }
    check(interrupted&&completed,"Number allocation boundary exercised");
}
const legacy=new Realm((_line:string)=>{}),binding=legacy.global.bindings.get("Number");
check(binding!==undefined&&binding.value.kind==="object"&&binding.value.object.callable===null&&binding.value.object.constructorSlot===null&&legacy.numberPrototype.getOwnProperty("constructor")===undefined,"legacy Number namespace retained");
console.log("Number constructor passed");
