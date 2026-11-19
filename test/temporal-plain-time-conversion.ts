import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared=prepareBoundedScript({id:"plain-time-conversion",text},realm);
    if(prepared.kind!=="ready")throw new Error("prepare: "+text);
    return evaluateScript(createScriptSession(),prepared.record).completion;
}
function passes(text:string):void { const r=run(text);check(r.type==="normal"&&r.value.kind==="boolean"&&r.value.value,text); }
const cases=[
    'Temporal.PlainTime.from("12:34:56.123456789").toString()==="12:34:56.123456789"',
    'Temporal.PlainTime.from("T1231").toString()==="12:31:00"',
    'Temporal.PlainTime.from("2000-02-29T12:34-23:59[Unknown/Zone]").toString()==="12:34:00"',
    'Temporal.PlainTime.from({minute:7}).toString()==="00:07:00"',
    'Temporal.PlainTime.from({hour:24,second:-1,nanosecond:1000}).toString()==="23:00:00.000000999"',
    'Temporal.PlainTime.from({hour:2.9,microsecond:3.9}).toString()==="02:00:00.000003"',
    'Temporal.PlainTime.from({hour:null,minute:true}).toString()==="00:01:00"',
    'Temporal.PlainTime.from({hour:1,get calendar(){throw 1},get timeZone(){throw 2}}).hour===1',
    'var t=new Temporal.PlainTime(1,2,3,4,5,6);var r=Temporal.PlainTime.from(t);r!==t&&r.toString()===t.toString()',
    'var t=new Temporal.PlainTime(1);Object.defineProperty(t,"hour",{get(){throw 1}});t.toString=function(){throw 2};t[Symbol.toPrimitive]=function(){throw 3};Temporal.PlainTime.from(t).hour===1',
    'class T extends Temporal.PlainTime{}var r=T.from(new T(1));!(r instanceof T)&&Object.getPrototypeOf(r)===Temporal.PlainTime.prototype',
    'Temporal.PlainTime.from.call(null,"12").hour===12',
    'var log="";Temporal.PlainTime.from({get hour(){log+="h";return {valueOf(){log+="H";return 1}}},get microsecond(){log+="u"},get millisecond(){log+="l"},get minute(){log+="m"},get nanosecond(){log+="n"},get second(){log+="s"}},{get overflow(){log+="o";return {toString(){log+="O";return "reject"}}}});log==="hHulmnsoO"',
    'var touched=false;var ok=false;try{Temporal.PlainTime.from("bad",{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false;var ok=false;try{Temporal.PlainTime.from({}, {get overflow(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var ok=false;try{Temporal.PlainTime.from({get hour(){throw 42}},null)}catch(e){ok=e===42}ok',
    'var touched=false;var ok=false;try{Temporal.PlainTime.from({toString(){touched=true;return "12"},[Symbol.toPrimitive](){touched=true;return "12"}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var touched=false;Temporal.PlainTime.from(new Temporal.PlainTime(1),{get overflow(){touched=true;return "constrain"}});touched',
    'Temporal.PlainTime.compare("12","13")===-1&&Temporal.PlainTime.compare("13","12")===1&&Object.is(Temporal.PlainTime.compare("12","12"),0)',
    'Temporal.PlainTime.compare({hour:99},"23")===0',
    'var log="";Temporal.PlainTime.compare({get hour(){log+="a";return 1}},{get hour(){log+="b";return 2}});log==="ab"',
    'var touched=false;var ok=false;try{Temporal.PlainTime.compare("bad",{get hour(){touched=true;return 1}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'new Temporal.PlainTime(12).equals("12")&&!new Temporal.PlainTime(12).equals({hour:13})',
    'new Temporal.PlainTime(23).equals({hour:99})',
    'var touched=false;var ok=false;try{Temporal.PlainTime.prototype.equals.call({}, {get hour(){touched=true;return 1}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'Temporal.PlainTime.from.length===1&&Temporal.PlainTime.compare.length===2&&Temporal.PlainTime.prototype.equals.length===1',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime,"from");d.writable&&!d.enumerable&&d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"equals");d.writable&&!d.enumerable&&d.configurable',
    'var ok=false;try{new Temporal.PlainTime.from("12")}catch(e){ok=e instanceof TypeError}ok',
];
for(const text of cases)passes(text);
for(const value of ['undefined','null','1','true','1n','Symbol()','{}','{hour:undefined}','new String("12")','new Temporal.Instant(0n)'])passes('var ok=false;try{Temporal.PlainTime.from('+value+')}catch(e){ok=e instanceof TypeError}ok');
for(const value of ['"bad"','"1231"','"12Z"','{hour:Infinity}','{hour:NaN}'])passes('var ok=false;try{Temporal.PlainTime.from('+value+')}catch(e){ok=e instanceof RangeError}ok');
for(const value of ['"12"','new Temporal.PlainTime(12)','{hour:12}']) {
    passes('var ok=false;try{Temporal.PlainTime.from('+value+',{overflow:"unknown"})}catch(e){ok=e instanceof RangeError}ok');
    passes('var ok=false;try{Temporal.PlainTime.from('+value+',null)}catch(e){ok=e instanceof TypeError}ok');
}
passes('var ok=false;try{Temporal.PlainTime.from({hour:24},{overflow:"reject"})}catch(e){ok=e instanceof RangeError}ok');
passes('var ok=false;try{new Temporal.PlainTime().equals("bad")}catch(e){ok=e instanceof RangeError}ok');
const names=['hour','minute','second','millisecond','microsecond','nanosecond'];
for(const name of names)passes('Temporal.PlainTime.compare({'+name+':1},{'+name+':2})===-1&&Temporal.PlainTime.compare({'+name+':2},{'+name+':1})===1');
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const method=run('Temporal.PlainTime.from',defining);
if(method.type!=="normal")throw new Error("method lookup");
calling.defineScriptGlobal("fromTime",{value:method.value});
const result=run('fromTime(new Temporal.PlainTime(4))',calling);
check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalPlainTimePrototype,"defining Realm result");
const failed=run('fromTime("bad")',calling);
check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("RangeError"),"defining Realm error");
calling.defineScriptGlobal("longInput",{value:{kind:"string",value:"12[x="+"a".repeat(1000)+"]"}});
const prepared=prepareBoundedScript({id:"time-budget",text:"try{fromTime(longInput)}catch(e){true}"},calling);
if(prepared.kind!=="ready")throw new Error("budget preparation");
const session=createScriptSession({maxSteps:200,maxCalls:64});
const stopped=evaluateScript(session,prepared.record).completion;
check(stopped.type==="throw"&&stopped.origin.kind==="resource-limit","parsing work charged");
check(session.inspect().active===null&&session.inspect().calls===0&&session.inspect().depth===0,"budget cleanup");
console.log("temporal plain time conversion passed");
