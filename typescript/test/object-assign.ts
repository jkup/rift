import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownSpecies, wellKnownToStringTag } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line:string)=>{},"script"); }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name,{value,writable:true,configurable:true}); }
function own(object: GuestObject, key: string): Value { const d=object.getOwnProperty(key);if(d===undefined||d.kind!=="data")throw new Error("own "+key);return d.value; }
function object(value: Value): GuestObject { if(value.kind!=="object")throw new Error("object value");return value.object; }
function run(text: string, realm=fresh(), steps=10000): ValueCompletion {
    const prepared=prepareBoundedScript({id:"object-assign",text},realm);if(prepared.kind!=="ready")throw new Error("prepare "+text);
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
for(const source of [
    "let t={a:0};Object.assign(t,{a:1,b:2},{a:3})===t&&t.a===3&&t.b===2;",
    "let t={};Object.assign(t,null,undefined,1,true)===t&&Object.keys(t).length===0;",
    "let t=Object.assign(7,{x:1});typeof t==='object'&&t.valueOf()===7&&t.x===1;",
    "let t=Object.assign({},'ab');t[0]==='a'&&t[1]==='b'&&!Object.hasOwn(t,'length')&&Object.getOwnPropertyDescriptor(t,'0').writable;",
    "let s=Object.create({inherited:1},{hidden:{value:2},own:{value:3,enumerable:true}});let t=Object.assign({},s);Object.keys(t).join(',')==='own'&&t.own===3;",
    "let calls=0;let s={};Object.defineProperty(s,'x',{enumerable:true,get:function(){calls++;return 7;}});let t=Object.assign({},s);let d=Object.getOwnPropertyDescriptor(t,'x');calls===1&&d.value===7&&d.writable&&d.enumerable&&d.configurable&&!Object.hasOwn(d,'get');",
    "let trace='';let s={};Object.defineProperty(s,'a',{enumerable:true,get:function(){trace+='A';return 1;}});Object.defineProperty(s,'b',{enumerable:true,get:function(){trace+='B';return 2;}});let t={};Object.defineProperty(t,'a',{set:function(v){trace+='a'+v;}});Object.defineProperty(t,'b',{set:function(v){trace+='b'+v;}});Object.assign(t,s);trace==='Aa1Bb2';",
    "let stored=0;let p={};Object.defineProperty(p,'x',{set:function(v){stored=v;}});let t=Object.preventExtensions(Object.create(p));Object.assign(t,{x:7})===t&&stored===7&&!Object.hasOwn(t,'x');",
    "let s={};Object.defineProperty(s,'a',{enumerable:true,get:function(){delete s.b;s.c=3;return 1;}});s.b=2;let t=Object.assign({},s);t.a===1&&!Object.hasOwn(t,'b')&&!Object.hasOwn(t,'c');",
    "let s={};Object.defineProperty(s,'a',{enumerable:true,get:function(){Object.defineProperty(s,'b',{enumerable:false});return 1;}});s.b=2;let t=Object.assign({},s);t.a===1&&!Object.hasOwn(t,'b');",
    "let s={};Object.defineProperty(s,'a',{enumerable:true,get:function(){Object.defineProperty(s,'b',{enumerable:true});return 1;}});Object.defineProperty(s,'b',{value:2,configurable:true});let t=Object.assign({},s);t.a===1&&t.b===2;",
    "let later={};let first={};Object.defineProperty(first,'x',{enumerable:true,get:function(){later.y=2;return 1;}});let t=Object.assign({},first,later);t.x===1&&t.y===2;",
    "let t={};Object.defineProperty(t,'b',{value:0});try{Object.assign(t,{a:1,b:2,c:3});}catch(e){e instanceof TypeError&&t.a===1&&t.b===0&&!Object.hasOwn(t,'c');}",
    "let t={};let marker={};let s={a:1};Object.defineProperty(s,'b',{enumerable:true,get:function(){throw marker;}});try{Object.assign(t,s,{c:3});}catch(e){e===marker&&t.a===1&&!Object.hasOwn(t,'c');}",
    "let a=[];Object.assign(a,{'2':7});a.length===3&&a[2]===7&&!Object.hasOwn(a,'0');",
    "let count=0;let s={};Object.defineProperty(s,'x',{enumerable:true,get:function(){count++;return 1;}});try{Object.assign(null,s);}catch(e){e instanceof TypeError&&count===0;}",
    "let o=Object.create({x:1});!o.propertyIsEnumerable('x')&&Object.prototype.propertyIsEnumerable.call('ab',0)&&!Object.prototype.propertyIsEnumerable.call('ab','length');",
    "let o={};Object.defineProperty(o,'x',{enumerable:true,get:function(){throw 1;}});o.propertyIsEnumerable('x')&&!o.propertyIsEnumerable('missing');",
    "let marker={};try{Object.prototype.propertyIsEnumerable.call(null,{toString:function(){throw marker;}});}catch(e){e===marker;}",
    "let calls='';let key={toString:function(){calls+='S';return 'x';},valueOf:function(){throw 1;}};let o={x:1};o.propertyIsEnumerable(key)&&calls==='S';",
    "Object.assign.length===2&&Object.assign.name==='assign'&&Object.prototype.propertyIsEnumerable.length===1;"
]){const result=run(source);check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),source);}
for(const source of ["Object.assign();","Object.assign(undefined);","Object.assign('a',{'0':'a'});","Object.assign(Object.freeze({x:1}),{x:1});","Object.prototype.propertyIsEnumerable.call(null,'x');"]){const result=run(source);check(result.type==="throw"&&result.diagnostic.name==="TypeError",source);}
{
    const r=fresh();seed(r,"s",{kind:"symbol",value:wellKnownSpecies});seed(r,"hidden",{kind:"symbol",value:wellKnownToStringTag});
    const result=run("let calls=0;let source={};Object.defineProperty(source,s,{enumerable:true,get:function(){calls++;return 7;}});Object.defineProperty(source,hidden,{value:8});let t=Object.assign({},source);calls===1&&t[s]===7&&!Object.hasOwn(t,hidden)&&t.propertyIsEnumerable(s)&&!source.propertyIsEnumerable(hidden);",r);
    check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),"symbol copying and predicate");
}
{
    const owner=fresh(),caller=fresh();seed(caller,"assign",own(object(own(owner.globalObject,"Object")),"assign"));seed(caller,"predicate",own(owner.objectPrototype,"propertyIsEnumerable"));
    const boxed=run("assign(7,{x:1});",caller);check(boxed.type==="normal"&&boxed.value.kind==="object"&&boxed.value.object.getPrototypeOf()===owner.numberPrototype,"assign boxed target Realm");
    for(const source of ["assign(null);","assign(Object.freeze({x:1}),{x:2});","predicate.call(null,'x');"]){const result=run(source,caller);check(result.type==="throw"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===owner.getErrorPrototype("TypeError"),"assign/predicate error Realm");}
}
{
    const r=fresh(),target=r.createObject(),source=r.createObject();for(let i=0;i<100;i++)source.bootstrapDefine(String(i),{value:{kind:"number",value:i},enumerable:true});
    seed(r,"target",{kind:"object",object:target});seed(r,"source",{kind:"object",object:source});const result=run("Object.assign(target,source);",r,40),count=target.ownPropertyKeys().length;
    check(result.type==="throw"&&result.origin.kind==="resource-limit"&&count>0&&count<100,"copy budget preserves completed writes");
}
check(new Realm((_line:string)=>{}).objectPrototype.getOwnProperty("propertyIsEnumerable")===undefined,"legacy enumerable predicate absent");
console.log("Object assignment passed");
