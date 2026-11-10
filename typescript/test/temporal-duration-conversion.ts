import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok:boolean,message:string):void {if(!ok)throw new Error(message);}
function run(text:string,realm:Realm=new Realm((_line:string)=>{},"script")):ValueCompletion {
    const prepared=prepareBoundedScript({id:"duration-conversion",text},realm);
    if(prepared.kind!=="ready")throw new Error("prepare: "+text);
    return evaluateScript(createScriptSession(),prepared.record).completion;
}
function passes(text:string):void {const r=run(text);check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,text);}
const cases=[
    'Temporal.Duration.from("P1Y2M3W4DT5H6M7.00800901S").toJSON()==="P1Y2M3W4DT5H6M7.00800901S"',
    'Temporal.Duration.from("PT1.5H").toJSON()==="PT1H30M"',
    'Temporal.Duration.from({years:1,months:2,weeks:3,days:4,hours:5,minutes:6,seconds:7,milliseconds:8,microseconds:9,nanoseconds:10}).toJSON()==="P1Y2M3W4DT5H6M7.00800901S"',
    'Temporal.Duration.from({milliseconds:9007199254740992}).toJSON()==="PT9007199254740.992S"',
    'Temporal.Duration.from({days:undefined,hours:null,minutes:true}).toJSON()==="PT1M"',
    'Object.is(Temporal.Duration.from({days:-0}).days,0)',
    'Temporal.Duration.from(Object.create({days:1})).days===1',
    'var d=new Temporal.Duration(1),r=Temporal.Duration.from(d);r!==d&&r.years===1',
    'var d=new Temporal.Duration(1);Object.defineProperty(d,"years",{get(){throw 1}});d[Symbol.toPrimitive]=function(){throw 2};Temporal.Duration.from(d).years===1',
    'class D extends Temporal.Duration{}var d=D.from(new D(1));!(d instanceof D)&&Object.getPrototypeOf(d)===Temporal.Duration.prototype',
    'Temporal.Duration.from.call(null,"P1D").days===1',
    'var d=new Temporal.Duration(1,2,3,4,5,6,7,8,9,10),r=d.with({minutes:11});r!==d&&r.toJSON()==="P1Y2M3W4DT5H11M7.00800901S"&&d.minutes===6',
    'new Temporal.Duration(1).with(new Temporal.Duration(0,2)).toJSON()==="P2M"',
    'var d=new Temporal.Duration(1);Object.defineProperty(d,"years",{value:2});new Temporal.Duration().with(d).years===2',
    'new Temporal.Duration(1).with({months:2,years:undefined}).toJSON()==="P1Y2M"',
    'new Temporal.Duration().with({days:1,calendar:"iso8601",timeZone:"UTC"}).days===1',
    'new Temporal.Duration().with({days:1},{get overflow(){throw 1}}).days===1',
    'class D extends Temporal.Duration{}var d=new D(1).with({years:2});!(d instanceof D)&&Object.getPrototypeOf(d)===Temporal.Duration.prototype',
    'var d=new Temporal.Duration(1);Object.defineProperty(d,"years",{get(){throw 1}});Object.defineProperty(d,"constructor",{get(){throw 2}});d.with({months:2}).years===1',
    'var touched=false;var ok=false;try{Temporal.Duration.from({toString(){touched=true;return "P1D"},[Symbol.toPrimitive](){touched=true;return "P1D"}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var log="";Temporal.Duration.from({get days(){log+="d";return{valueOf(){log+="D";return 1}}},get hours(){log+="h"},get microseconds(){log+="u"},get milliseconds(){log+="l"},get minutes(){log+="m"},get months(){log+="M"},get nanoseconds(){log+="n"},get seconds(){log+="s"},get weeks(){log+="w"},get years(){log+="y"}});log==="dDhulmMnswy"',
    'var touched=false;var ok=false;try{Temporal.Duration.from({days:0.5,get hours(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var ok=false;try{Temporal.Duration.from({days:9007199254740992,get years(){throw 42}})}catch(e){ok=e===42}ok',
    'var touched=false;var ok=false;try{Temporal.Duration.prototype.with.call({}, {get days(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var d=new Temporal.Duration(1),ok=false;try{d.with({days:-1})}catch(e){ok=e instanceof RangeError}ok&&d.years===1&&d.days===0',
    'Temporal.Duration.from.length===1&&Temporal.Duration.prototype.with.length===1',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration,"from");d.writable&&!d.enumerable&&d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"with");d.writable&&!d.enumerable&&d.configurable',
];
for(const text of cases)passes(text);
for(const value of ['undefined','null','true','1','1n','Symbol()','{}','{days:undefined}','new String("P1D")'])passes('var ok=false;try{Temporal.Duration.from('+value+')}catch(e){ok=e instanceof TypeError}ok');
for(const value of ['"bad"','"P"','"PT1.5H1M"','{days:NaN}','{hours:Infinity}','{seconds:0.5}','{years:1,days:-1}','{years:4294967296}'])passes('var ok=false;try{Temporal.Duration.from('+value+')}catch(e){ok=e instanceof RangeError}ok');
for(const value of ['undefined','null','"P1D"','{}','{days:undefined}'])passes('var ok=false;try{new Temporal.Duration().with('+value+')}catch(e){ok=e instanceof TypeError}ok');
for(const name of ['years','months','weeks','days','hours','minutes','seconds','milliseconds','microseconds','nanoseconds']) {
    passes('Temporal.Duration.from({'+name+':1}).'+name+'===1&&new Temporal.Duration().with({'+name+':1}).'+name+'===1');
    passes('var ok=false;try{Temporal.Duration.from({'+name+':1n})}catch(e){ok=e instanceof TypeError}ok');
}
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const from=run('Temporal.Duration.from',defining),replace=run('Temporal.Duration.prototype.with',defining);
if(from.type!=="normal"||replace.type!=="normal")throw new Error("method lookup");
calling.defineScriptGlobal("fromDuration",{value:from.value});calling.defineScriptGlobal("replaceDuration",{value:replace.value});
for(const text of ['fromDuration(new Temporal.Duration(1))','replaceDuration.call(new Temporal.Duration(1),{months:2})']) {
    const result=run(text,calling);
    check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalDurationPrototype,"defining Realm result");
}
const failed=run('fromDuration("bad")',calling);
check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("RangeError"),"defining Realm error");
calling.defineScriptGlobal("longInput",{value:{kind:"string",value:"P"+"0".repeat(1000)+"D"}});
const prepared=prepareBoundedScript({id:"duration-budget",text:"try{fromDuration(longInput)}catch(e){true}"},calling);
if(prepared.kind!=="ready")throw new Error("budget preparation");
const session=createScriptSession({maxSteps:200,maxCalls:64});
const stopped=evaluateScript(session,prepared.record).completion;
check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit","parsing work charged");
check(session.inspect().active===null&&session.inspect().calls===0&&session.inspect().depth===0,"budget cleanup");
console.log("temporal duration conversion passed");
