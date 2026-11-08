import { Realm } from "../src/realm.js";
import { GuestObject, sameValue, type PropertyKey, type Value, type ValueCompletion } from "../src/runtime.js";
import { GuestArray } from "../src/array-object.js";
import { wellKnownSpecies, wellKnownToStringTag } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line:string)=>{},"script"); }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name,{value,writable:true,configurable:true}); }
function own(object: GuestObject, key: PropertyKey): Value { const d=object.getOwnProperty(key);if(d===undefined||d.kind!=="data")throw new Error("own data property");return d.value; }
function object(value: Value): GuestObject { if(value.kind!=="object")throw new Error("object value");return value.object; }
function run(text: string, realm=fresh(), steps=10000): ValueCompletion {
    const prepared=prepareBoundedScript({id:"object-reflection",text},realm);if(prepared.kind!=="ready")throw new Error("prepare "+text);
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
for(const source of [
    "let o=Object.create({inherited:1});o.z=1;o[10]=2;o[2]=3;Object.defineProperty(o,'hidden',{value:4});o.a=5;delete o.z;o.z=6;Object.getOwnPropertyNames(o).join(',')==='2,10,hidden,a,z';",
    "Object.getOwnPropertyNames([1,,3]).join(',')==='0,2,length';",
    "Object.getOwnPropertyNames('ab').join(',')==='0,1,length'&&Object.getOwnPropertySymbols('ab').length===0;",
    "Object.getOwnPropertyNames(1).length===0&&Object.getOwnPropertyNames(true).length===0&&Object.keys(Object.getOwnPropertyDescriptors(1)).length===0;",
    "let d=Object.getOwnPropertyDescriptors('ab');d[0].value==='a'&&!d[0].writable&&d[0].enumerable&&!d[0].configurable&&d.length.value===2&&!d.length.enumerable;",
    "let f=function(a){};let d=Object.getOwnPropertyDescriptors(f);d.length.value===1&&d.name.value==='f'&&Object.getOwnPropertyNames(f).indexOf('prototype')!==-1;",
    "let getter=function(){throw 1;};let setter=function(v){throw 2;};let o=Object.create(null,{x:{get:getter,set:setter,enumerable:false,configurable:true}});let d=Object.getOwnPropertyDescriptors(o);d.x.get===getter&&d.x.set===setter&&!d.x.enumerable&&d.x.configurable&&!Object.hasOwn(d.x,'value')&&!Object.hasOwn(d.x,'writable');",
    "let o=Object.create(null,{x:{value:7}});let d=Object.getOwnPropertyDescriptors(o);d.x.value=9;let outer=Object.getOwnPropertyDescriptor(d,'x');o.x===7&&outer.writable&&outer.enumerable&&outer.configurable;",
    "let o={};Object.defineProperty(o,'x',{get:function(){throw 1;}});Object.getOwnPropertyNames(o)[0]==='x'&&Object.getOwnPropertySymbols(o).length===0;",
    "let o={valueOf:function(){throw 1;},toString:function(){throw 2;}};Object.getOwnPropertyNames(o).length===2&&Object.getOwnPropertyDescriptors(o).valueOf.value===o.valueOf;"
]){const result=run(source);check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),source);}
{
    const r=fresh(),input=r.createObject();
    input.bootstrapDefine(wellKnownSpecies,{value:{kind:"number",value:1},enumerable:false,configurable:true});
    input.bootstrapDefine("name",{value:{kind:"number",value:2}});
    input.bootstrapDefine(wellKnownToStringTag,{value:{kind:"number",value:3},enumerable:true});
    seed(r,"input",{kind:"object",object:input});
    const names=run("Object.getOwnPropertyNames(input);",r),symbols=run("Object.getOwnPropertySymbols(input);",r),descriptors=run("Object.getOwnPropertyDescriptors(input);",r);
    check(names.type==="normal"&&sameValue(own(object(names.value),"length"),{kind:"number",value:1}),"names exclude symbols");
    if(symbols.type!=="normal"||descriptors.type!=="normal")throw new Error("symbol reflection");
    const array=object(symbols.value),map=object(descriptors.value);
    check(sameValue(own(array,"0"),{kind:"symbol",value:wellKnownSpecies})&&sameValue(own(array,"1"),{kind:"symbol",value:wellKnownToStringTag}),"symbol order and identity");
    check(sameValue(own(object(own(map,wellKnownSpecies)),"value"),{kind:"number",value:1})&&sameValue(own(object(own(map,wellKnownSpecies)),"enumerable"),{kind:"boolean",value:false}),"symbol descriptor");
}
for(const name of ["getOwnPropertyNames","getOwnPropertySymbols","getOwnPropertyDescriptors"]){
    const owner=fresh(),caller=fresh(),method=own(object(own(owner.globalObject,"Object")),name);
    seed(caller,"method",method);seed(caller,"symbol",{kind:"symbol",value:wellKnownSpecies});
    const result=run("method({x:1});",caller);
    if(result.type!=="normal")throw new Error("foreign reflection");const output=object(result.value);
    check(output.getPrototypeOf()===(name==="getOwnPropertyDescriptors"?owner.objectPrototype:owner.arrayPrototype),"reflection result Realm");
    if(name==="getOwnPropertyDescriptors")check(object(own(output,"x")).getPrototypeOf()===owner.objectPrototype,"descriptor Realm");else check(output instanceof GuestArray,"reflection array");
    for(const expression of ["method();","method(null);"]){const bad=run(expression,caller);check(bad.type==="throw"&&bad.value.kind==="object"&&bad.value.object.getPrototypeOf()===owner.getErrorPrototype("TypeError"),"reflection error Realm");}
    const primitive=run("method(symbol);",caller);check(primitive.type==="normal","symbol primitive boxes");
    const metadata=run("Object."+name+".name==='"+name+"'&&Object."+name+".length===1;");check(metadata.type==="normal"&&sameValue(metadata.value,{kind:"boolean",value:true}),"reflection metadata");
    const r=fresh(),input=r.createObject();for(let i=0;i<100;i++)input.bootstrapDefine(String(i),{value:{kind:"number",value:i}});seed(r,"input",{kind:"object",object:input});
    const limited=run("Object."+name+"(input);",r,40);check(limited.type==="throw"&&limited.origin.kind==="resource-limit","reflection key budget");
}
{
    const r=fresh(),input=r.createObject();input.bootstrapDefine("__proto__",{value:{kind:"number",value:7}});seed(r,"input",{kind:"object",object:input});
    const result=run("Object.getOwnPropertyDescriptors(input);",r);if(result.type!=="normal")throw new Error("prototype-name descriptor");
    const map=object(result.value);check(map.getPrototypeOf()===r.objectPrototype&&sameValue(own(object(own(map,"__proto__")),"value"),{kind:"number",value:7}),"prototype-name is ordinary own data");
}
console.log("Object reflection passed");
