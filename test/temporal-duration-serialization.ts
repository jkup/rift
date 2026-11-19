import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok:boolean,message:string):void {if(!ok)throw new Error(message);}
function run(text:string,realm:Realm=new Realm((_line:string)=>{},"script")):ValueCompletion {
    const prepared=prepareBoundedScript({id:"duration-serialization",text},realm);
    if(prepared.kind!=="ready")throw new Error("prepare: "+text);
    return evaluateScript(createScriptSession(),prepared.record).completion;
}
function passes(text:string):void {const r=run(text);check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,text);}
for(const method of ['toJSON','toLocaleString']) {
    passes('new Temporal.Duration().'+method+'()==="PT0S"');
    passes('new Temporal.Duration(1,2,3,4,5,6,7,8,9,10).'+method+'()==="P1Y2M3W4DT5H6M7.00800901S"');
    passes('new Temporal.Duration(-1,-2,-3,-4,-5,-6,-7,-8,-9,-10).'+method+'()==="-P1Y2M3W4DT5H6M7.00800901S"');
    passes('new Temporal.Duration(0,0,0,0,0,0,0,9007199254740992).'+method+'()==="PT9007199254740.992S"');
    passes('new Temporal.Duration(0,0,0,0,0,0,9007199254740991,999,999,999).'+method+'()==="PT9007199254740991.999999999S"');
    passes('new Temporal.Duration(1).'+method+'({toString(){throw 1},get length(){throw 2}},{get fractionalSecondDigits(){throw 3}})==="P1Y"');
    passes('var d=new Temporal.Duration(1);d.toString=function(){throw 1};d.valueOf=function(){throw 2};Object.defineProperty(d,"years",{get(){throw 3}});d.'+method+'()==="P1Y"');
    passes('class D extends Temporal.Duration{}new D(1).'+method+'()==="P1Y"');
    passes('var d=new Temporal.Duration(1);Object.setPrototypeOf(d,null);Temporal.Duration.prototype.'+method+'.call(d)==="P1Y"');
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable');
    for(const receiver of ['null','undefined','{}','Temporal.Duration.prototype','new Temporal.PlainTime()'])passes('var ok=false;try{Temporal.Duration.prototype.'+method+'.call('+receiver+')}catch(e){ok=e instanceof TypeError}ok');
    const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
    const fn=run('Temporal.Duration.prototype.'+method,defining);
    if(fn.type!=="normal")throw new Error("method lookup");
    calling.defineScriptGlobal("serialize",{value:fn.value});
    const result=run('serialize.call(new Temporal.Duration(1))',calling);
    check(result.type==="normal"&&result.value.kind==="string"&&result.value.value==='P1Y','cross-Realm brand');
    const failed=run('serialize.call({})',calling);
    check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),'defining Realm error');
}
passes('JSON.stringify({duration:new Temporal.Duration(0,0,0,0,0,0,1,2,3,4)})===\'{"duration":"PT1.002003004S"}\'');
console.log('temporal duration serialization passed');
