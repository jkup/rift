import { getPrototypeFromConstructor } from "../src/constructor-prototype.js";
import { normal, type ValueCompletion } from "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-core", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("completion: " + text);
    return result.value;
}
function passes(text: string): void { const value=run(text);if(value.kind!=="boolean"||!value.value)throw new Error(text); }
for(const text of [
 'Date.name==="Date"&&Date.length===7&&Date.now.length===0&&Date.parse.length===1&&Date.UTC.length===7',
 'new Date(0).getTime()===0&&new Date(-1).toISOString()==="1969-12-31T23:59:59.999Z"',
 'new Date(null).getTime()===0&&new Date(true).getTime()===1&&Number.isNaN(new Date(undefined).getTime())',
 '1/new Date(-0.9).getTime()===Infinity',
 'new Date(1970,0).getTime()===0&&new Date(70,0).getTime()===0&&new Date(-0.9,0).toISOString()==="1900-01-01T00:00:00.000Z"',
 'Date.UTC(1970)===0&&Number.isNaN(Date.UTC())&&Number.isNaN(Date.UTC(1970,undefined))',
 'new Date(2000,1,30,25).toISOString()==="2000-03-02T01:00:00.000Z"',
 'new Date("0000-01-01").toISOString()==="0000-01-01T00:00:00.000Z"',
 'new Date("+275760-09-13T01:00+01:00").getTime()===8640000000000000',
 'new Date(-271821,3,20).getTime()===-8640000000000000&&new Date(275760,8,13).getTime()===8640000000000000',
 'new Date(NaN).toString()==="Invalid Date"&&new Date(Infinity).toUTCString()==="Invalid Date"',
 'Date.prototype.toGMTString===Date.prototype.toUTCString&&Date.prototype.toGMTString.name==="toUTCString"',
 'Object.prototype.toString.call(new Date())==="[object Date]"&&Object.prototype.toString.call(Date.prototype)==="[object Object]"',
 'var d=new Date(0);Object.setPrototypeOf(d,null);Date.prototype.getTime.call(d)===0&&Object.prototype.toString.call(d)==="[object Date]"',
 'var d=new Date(0);d[Symbol.toStringTag]="Custom";Object.prototype.toString.call(d)==="[object Custom]"',
 'var d=new Date(123);Object.defineProperty(d,Symbol.toPrimitive,{get(){throw 1}});Object.defineProperty(d,"valueOf",{get(){throw 2}});new Date(d).getTime()===123',
 'var hint="";new Date({[Symbol.toPrimitive](h){hint=h;return "1970-01-01"}}).getTime()===0&&hint==="default"',
 'var hint="";Date.parse({[Symbol.toPrimitive](h){hint=h;return "1970-01-01"}})===0&&hint==="string"',
 'var log="";var args=[];for(var i=0;i<7;i++){let n=i;args.push({valueOf(){log+=n;return n===0?NaN:0}})}Number.isNaN(Date.UTC(...args))&&log==="0123456"',
 'var log="";new Date({valueOf(){log+="y";return 1970}},{valueOf(){log+="m";return 0}},{valueOf(){log+="d";return 1}}).getTime()===0&&log==="ymd"',
 'var touched=false;Date({toString(){touched=true;throw 1}});!touched',
 'var d=new Date(0);d+1===d.toString()+"1"&&+d===0',
 'Date.prototype[Symbol.toPrimitive].call({toString(){return "x"},valueOf(){return 2}},"default")==="x"&&Date.prototype[Symbol.toPrimitive].call({toString(){return "x"},valueOf(){return 2}},"number")===2',
 'var d=Object.getOwnPropertyDescriptor(Date.prototype,Symbol.toPrimitive);!d.writable&&!d.enumerable&&d.configurable&&d.value.length===1&&d.value.name==="[Symbol.toPrimitive]"',
 'class D extends Date{}var d=new D(0);d instanceof D&&d instanceof Date&&d.getTime()===0&&Object.getPrototypeOf(d)===D.prototype',
 'class D extends Date{constructor(){super(1)}}new D().getTime()===1',
 'Object.keys(new Date(0)).length===0',
 'var d=new Date(-1000);Date.parse(d.toString())===-1000&&Date.parse(d.toUTCString())===-1000&&Date.parse(d.toISOString())===-1000',
])passes(text);
for(const expression of ['new Date(1n)','new Date(Symbol())','Date.UTC(1n)','Date.parse(Symbol())','Date.prototype.getTime()','Date.prototype.toString()','Date.prototype.valueOf.call({})','Date.prototype.toISOString.call({})','Date.prototype[Symbol.toPrimitive].call(1,"default")','Date.prototype[Symbol.toPrimitive].call({},"bad")'])passes('var ok=false;try{'+expression+'}catch(e){ok=e instanceof TypeError}ok');
passes('var ok=false;try{new Date(NaN).toISOString()}catch(e){ok=e instanceof RangeError}ok');
const owner=new Realm((_line:string)=>{},"script"),caller=new Realm((_line:string)=>{},"script");
owner.clockMilliseconds=()=>1234;caller.clockMilliseconds=()=>5678;
caller.defineScriptGlobal("OwnerDate",{value:run('Date',owner)});
caller.defineScriptGlobal("OwnerTypeError",{value:run('TypeError',owner)});
const cross=run('var d=new OwnerDate();var ok=d.getTime()===1234&&OwnerDate.now()===1234&&Date.now()===5678&&new Date().getTime()===5678&&d instanceof OwnerDate&&!(d instanceof Date);try{OwnerDate.prototype.getTime.call({})}catch(e){ok=ok&&e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok',caller);
if(cross.kind!=="boolean"||!cross.value)throw new Error("Date clock/result/error Realm");
const display=run('Date()',owner);if(display.kind!=="string"||display.value!=="Thu Jan 01 1970 00:00:01 GMT+0000 (Coordinated Universal Time)")throw new Error("Date call uses owner clock");
const legacy=new Realm((_line:string)=>{});if(legacy.global.bindings.has("Date"))throw new Error("legacy profile Date leak");
caller.defineScriptGlobal("F",{value:run("function F(){}F.prototype=0;F",owner)});
caller.defineScriptGlobal("expectedProto",{value:{kind:"object",object:owner.datePrototype}});
const pick=caller.createBuiltin("pickDate",1,(_receiver,args,context,loc):ValueCompletion=>{
    if(args.length===0||args[0].kind!=="object")throw new Error("test constructor");
    const result=getPrototypeFromConstructor(args[0].object,"Date",context,loc);
    return result.type==="throw"?result:normal({kind:"object",object:result.value});
});
caller.defineScriptGlobal("pickDate",{value:{kind:"object",object:pick}});
const fallback=run("pickDate(F)===expectedProto",caller);
if(fallback.kind!=="boolean"||!fallback.value)throw new Error("Date newTarget Realm fallback");
console.log("date core passed");
