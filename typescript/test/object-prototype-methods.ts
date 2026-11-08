import { Realm } from "../src/realm.js";
import { GuestObject, sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownSpecies, wellKnownToStringTag } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line:string)=>{},"script"); }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name,{value,writable:true,configurable:true}); }
function own(object: GuestObject, key: string): Value { const d=object.getOwnProperty(key);if(d===undefined||d.kind!=="data")throw new Error("own "+key);return d.value; }
function object(value: Value): GuestObject { if(value.kind!=="object")throw new Error("object value");return value.object; }
function run(text: string, realm=fresh(), steps=10000): ValueCompletion {
    const prepared=prepareBoundedScript({id:"object-prototype-methods",text},realm);if(prepared.kind!=="ready")throw new Error("prepare "+text);
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
for(const source of [
    "Object.is(NaN,NaN)&&!Object.is(-0,0)&&Object.is(-0,-0)&&Object.is()&&!Object.is(1,'1')&&!Object.is({},{});",
    "let o={valueOf:function(){throw 1;},toString:function(){throw 2;}};Object.is(o,o)&&!Object.is(o,1)&&Object.getPrototypeOf(o)===Object.prototype;",
    "Object.getPrototypeOf(1)===Number.prototype&&Object.getPrototypeOf('a')===String.prototype&&Object.getPrototypeOf(false)===Boolean.prototype;",
    "Object.getPrototypeOf(Object.create(null))===null&&Object.getPrototypeOf(Object.prototype)===null;",
    "let p={x:7};let o={};Object.setPrototypeOf(o,p)===o&&Object.getPrototypeOf(o)===p&&o.x===7;",
    "let o={};Object.setPrototypeOf(o,null)===o&&Object.getPrototypeOf(o)===null&&!('toString' in o);",
    "let p={};let o=Object.create(p);Object.preventExtensions(o);Object.setPrototypeOf(o,p)===o;",
    "let p={};let o=Object.create(p);Object.preventExtensions(o);try{Object.setPrototypeOf(o,{});}catch(e){e instanceof TypeError&&Object.getPrototypeOf(o)===p;}",
    "Object.setPrototypeOf(Object.prototype,null)===Object.prototype;",
    "try{Object.setPrototypeOf(Object.prototype,{});}catch(e){e instanceof TypeError&&Object.getPrototypeOf(Object.prototype)===null;}",
    "let o={};try{Object.setPrototypeOf(o,o);}catch(e){e instanceof TypeError&&Object.getPrototypeOf(o)===Object.prototype;}",
    "let a={};let b=Object.create(a);try{Object.setPrototypeOf(a,b);}catch(e){e instanceof TypeError&&Object.getPrototypeOf(a)===Object.prototype&&Object.getPrototypeOf(b)===a;}",
    "let p={};let a=Object.create(p);let b=Object.create(a);p.isPrototypeOf(b)&&a.isPrototypeOf(b)&&!b.isPrototypeOf(p)&&!p.isPrototypeOf(p);",
    "Object.prototype.isPrototypeOf.call(null,1)===false&&Object.prototype.isPrototypeOf.call(undefined)===false&&Object.prototype.isPrototypeOf.call(1,{})===false;",
    "try{Object.prototype.isPrototypeOf.call(null,{});}catch(e){e instanceof TypeError;}",
    "let o=new Number(7);Object.setPrototypeOf(o,null);Number.prototype.valueOf.call(o)===7;",
    "let a=[];Object.setPrototypeOf(a,null);Array.prototype.push.call(a,7);Array.isArray(a)&&a[0]===7&&a.length===1;",
    "let p=function(){};let o={};Object.setPrototypeOf(o,p);Object.getPrototypeOf(o)===p;",
    "Object.is(Object.setPrototypeOf(-0,null),-0)&&Object.is(Object.setPrototypeOf(NaN,{}),NaN)&&Object.setPrototypeOf('x',null)==='x';"
]){const result=run(source);check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),source);}
for(const source of ["Object.getPrototypeOf();","Object.getPrototypeOf(null);","Object.setPrototypeOf();","Object.setPrototypeOf(null,null);","Object.setPrototypeOf({},1);","Object.setPrototypeOf(1,undefined);"]){const result=run(source);check(result.type==="throw"&&result.diagnostic.name==="TypeError",source);}
{
    const r=fresh();seed(r,"a",{kind:"symbol",value:wellKnownSpecies});seed(r,"b",{kind:"symbol",value:wellKnownToStringTag});
    const result=run("Object.is(a,a)&&!Object.is(a,b)&&Object.setPrototypeOf(a,null)===a;",r);
    check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),"symbol identity");
}
{
    const owner=fresh(),caller=fresh(),constructor=object(own(owner.globalObject,"Object"));
    seed(caller,"get",own(constructor,"getPrototypeOf"));seed(caller,"set",own(constructor,"setPrototypeOf"));seed(caller,"inspect",own(owner.objectPrototype,"isPrototypeOf"));
    const boxed=run("get(1);",caller);check(boxed.type==="normal"&&boxed.value.kind==="object"&&boxed.value.object===owner.numberPrototype,"boxing uses builtin Realm");
    const target=caller.createObject(),prototype=caller.createObject();seed(caller,"target",{kind:"object",object:target});seed(caller,"proto",{kind:"object",object:prototype});
    const changed=run("set(target,proto);",caller);check(changed.type==="normal"&&changed.value.kind==="object"&&changed.value.object===target&&target.getPrototypeOf()===prototype,"foreign mutation preserves identities");
    for(const source of ["get(null);","set(null,null);","set(target,target);","inspect.call(null,{});"]){const result=run(source,caller);check(result.type==="throw"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===owner.getErrorPrototype("TypeError"),"prototype error Realm");}
}
{
    const r=fresh(),root=r.createObject(),target=r.createObject(),prior=target.getPrototypeOf();let chain=root;
    for(let i=0;i<2000;i++)chain=new GuestObject(chain);
    seed(r,"root",{kind:"object",object:root});seed(r,"chain",{kind:"object",object:chain});seed(r,"target",{kind:"object",object:target});
    const limited=run("Object.setPrototypeOf(target,chain);",r,50);
    check(limited.type==="throw"&&limited.origin.kind==="resource-limit"&&target.getPrototypeOf()===prior,"interrupted mutation does not install prototype");
    const completed=run("Object.setPrototypeOf(target,chain);",r,3000);
    check(completed.type==="normal"&&target.getPrototypeOf()===chain,"deep mutation completes without recursion");
    const inspection=run("root.isPrototypeOf(target);",r,50);
    check(inspection.type==="throw"&&inspection.origin.kind==="resource-limit","prototype inspection budget");
    const found=run("root.isPrototypeOf(target);",r,3000);check(found.type==="normal"&&sameValue(found.value,{kind:"boolean",value:true}),"deep prototype inspection");
    const cycle=run("Object.setPrototypeOf(root,target);",r,3000);check(cycle.type==="throw"&&cycle.diagnostic.name==="TypeError"&&root.getPrototypeOf()===r.objectPrototype,"deep cycle rejected atomically");
    check(target.setPrototypeOf(null).value&&target.getPrototypeOf()===null,"trusted host mutation retained");
}
check(new Realm((_line:string)=>{}).objectPrototype.getOwnProperty("isPrototypeOf")===undefined,"legacy prototype retained");
console.log("Object prototype methods passed");
