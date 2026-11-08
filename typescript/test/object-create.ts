import { Realm } from "../src/realm.js";
import { normal, sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownSpecies } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name, {value,writable:true,configurable:true}); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"object-create",text},realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({maxSteps:steps,maxCalls:64}),prepared.record).completion;
}
for (const source of [
    "let p={inherited:1};let o=Object.create(p,{x:{value:2,enumerable:true}});o.inherited===1&&o.x===2&&Object.keys(o).join(',')==='x'&&Object.isExtensible(o);",
    "let o=Object.create(null);!('toString' in o)&&!('constructor' in o)&&Object.keys(o).length===0;",
    "let o={};Object.defineProperties(o,{x:{value:1,writable:true},y:{value:2,enumerable:true}})===o&&o.x===1&&o.y===2&&Object.keys(o).join(',')==='y';",
    "let o=Object.create(null,{x:{value:1}});let d=Object.getOwnPropertyDescriptor(o,'x');!d.writable&&!d.enumerable&&!d.configurable;",
    "let stored=1;let o=Object.create(null,{x:{get:function(){return stored;},set:function(v){stored=v;}}});o.x=7;o.x===7;",
    "let target={};try{Object.defineProperties(target,{a:{value:1},b:{get:1}});}catch(e){e instanceof TypeError&&!Object.hasOwn(target,'a');}",
    "let target={};let marker={};let bad={};Object.defineProperty(bad,'value',{get:function(){throw marker;}});try{Object.defineProperties(target,{a:{value:1},b:bad});}catch(e){e===marker&&!Object.hasOwn(target,'a');}",
    "let target={};let later={};Object.defineProperty(later,'value',{get:function(){if(Object.hasOwn(target,'a'))throw 1;return 2;}});Object.defineProperties(target,{a:{value:1},b:later});target.a===1&&target.b===2;",
    "let target={};Object.defineProperty(target,'b',{value:0});let seen=false;let later={};Object.defineProperty(later,'value',{get:function(){seen=true;return 3;}});try{Object.defineProperties(target,{a:{value:1},b:{value:2},c:later});}catch(e){e instanceof TypeError&&seen&&target.a===1&&target.b===0&&!Object.hasOwn(target,'c');}",
    "let props=Object.create({inherited:{value:1}});Object.defineProperty(props,'hidden',{get:function(){throw 1;},enumerable:false});props.visible={value:2};let o=Object.create(null,props);!Object.hasOwn(o,'hidden')&&!Object.hasOwn(o,'inherited')&&o.visible===2;",
    "let proto={value:7,writable:true};let descriptor=Object.create(proto);let o=Object.create(null,{x:descriptor});o.x=8;o.x===8;",
    "let props={};Object.defineProperty(props,'a',{enumerable:true,get:function(){delete props.b;props.c={value:3};return {value:1};}});props.b={value:2};let o=Object.create(null,props);o.a===1&&!Object.hasOwn(o,'b')&&!Object.hasOwn(o,'c');",
    "let props={};Object.defineProperty(props,'a',{enumerable:true,get:function(){Object.defineProperty(props,'b',{enumerable:false});return {value:1};}});props.b={value:2};let o=Object.create(null,props);o.a===1&&!Object.hasOwn(o,'b');",
    "let a=[];try{Object.defineProperties(a,{'2':{value:9,enumerable:true},length:{value:1}});}catch(e){e instanceof TypeError&&a.length===3&&a[2]===9;}",
    "let a=[];Object.defineProperties(a,{'2':{value:9,configurable:true},length:{value:1}});a.length===1&&!Object.hasOwn(a,'2');",
    "let p={};Object.defineProperty(p,'x',{set:function(){throw 1;}});let o=Object.create(p,{x:{value:7}});o.x===7&&Object.hasOwn(o,'x');",
    "let o={};Object.defineProperties(o,7)===o&&Object.defineProperties(o,true)===o&&Object.defineProperties(o,'')===o;",
    "let proto={};Object.create(proto,undefined)!==Object.create(proto)&&Object.create(proto,7)!==proto;",
    "Object.create.length===2&&Object.defineProperties.length===2&&Object.create.name==='create'&&Object.defineProperties.name==='defineProperties';"
]) {
    const result=run(source);check(result.type==="normal"&&sameValue(result.value,{kind:"boolean",value:true}),source);
}
for(const source of ["Object.create();","Object.create(1);","Object.create(null,null);","Object.defineProperties({},undefined);","Object.defineProperties({},null);","Object.defineProperties({},'a');","Object.defineProperties(1,{});"]){
    const result=run(source);check(result.type==="throw"&&result.diagnostic.name==="TypeError",source);
}
{
    const r=fresh(),props=r.createObject(),descriptor=r.createObject();
    descriptor.bootstrapDefine("value",{value:{kind:"number",value:7}});
    props.bootstrapDefine(wellKnownSpecies,{value:{kind:"object",object:descriptor},enumerable:true});
    seed(r,"props",{kind:"object",object:props});const result=run("Object.create(null,props);",r);
    if(result.type!=="normal"||result.value.kind!=="object")throw new Error("symbol create");
    const actual=result.value.object.getOwnProperty(wellKnownSpecies);
    check(result.value.object.getPrototypeOf()===null&&actual!==undefined&&actual.kind==="data"&&sameValue(actual.value,{kind:"number",value:7}),"symbol key and null prototype");
}
{
    const r=fresh(),descriptor=r.createObject();let order="";
    for(const field of ["enumerable","configurable","value","writable","get","set"]){
        descriptor.bootstrapDefine(field,{get:{kind:"object",object:r.createBuiltin("read",0,(_receiver,_args,_context,_loc):ValueCompletion=>{order+=field+",";return normal();})}});
    }
    const props=r.createObject();props.bootstrapDefine("x",{value:{kind:"object",object:descriptor},enumerable:true});seed(r,"props",{kind:"object",object:props});
    const result=run("Object.defineProperties({},props);",r);
    check(result.type==="throw"&&result.diagnostic.name==="TypeError"&&order==="enumerable,configurable,value,writable,get,set,","all fields read before mixed-descriptor rejection");
}
for(const name of ["create","defineProperties"]){
    const owner=fresh(),caller=fresh(),ctor=owner.globalObject.getOwnProperty("Object");
    if(ctor===undefined||ctor.kind!=="data"||ctor.value.kind!=="object")throw new Error("Object constructor");
    const method=ctor.value.object.getOwnProperty(name);if(method===undefined||method.kind!=="data")throw new Error("Object method");
    seed(caller,"method",method.value);const result=run("method(1,null);",caller);
    check(result.type==="throw"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===owner.getErrorPrototype("TypeError"),"creation error Realm");
}
{
    let empty=false,partial=false,complete=false;
    for(let steps=0;steps<=900;steps+=20){
        const r=fresh(),target=r.createObject(),props=r.createObject();
        for(let i=0;i<100;i++){const d=r.createObject();d.bootstrapDefine("value",{value:{kind:"number",value:i}});props.bootstrapDefine(String(i),{value:{kind:"object",object:d},enumerable:true});}
        seed(r,"target",{kind:"object",object:target});seed(r,"props",{kind:"object",object:props});const result=run("Object.defineProperties(target,props);",r,steps),count=target.ownPropertyKeys().length;
        if(result.type==="throw"){check(result.origin.kind==="resource-limit","descriptor budget");if(count===0)empty=true;else if(count<100)partial=true;}else{check(count===100,"all descriptors applied");complete=true;}
    }
    check(empty&&partial&&complete,"both descriptor phases bounded");
}
console.log("Object creation passed");
