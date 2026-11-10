import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { durationRoundSettings } from "../src/temporal-duration-round-options.js";
import { toTemporalDurationFields } from "../src/temporal-duration-fields.js";
import { normal, UNDEFINED, type ValueCompletion } from "../src/runtime.js";
function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    realm.registerBuiltin(realm.globalObject, "roundOptions", 2, (_receiver, args, context, loc): ValueCompletion => {
        const duration=toTemporalDurationFields(args.length<2?{kind:"string",value:"PT25H"}:args[1],context,loc);
        if(duration.type==="throw")return duration;
        const result=durationRoundSettings(args.length===0?UNDEFINED:args[0],duration.value,context,loc);
        if(result.type==="throw")return result;
        const v=result.value,date=v.relativeTo!==null&&v.relativeTo.kind==="plain"?v.relativeTo.date:null;
        return normal({kind:"string",value:v.largest+":"+v.smallest+":"+v.increment+":"+v.mode+":"+(date===null?"none":date.year+"-"+date.month+"-"+date.day)});
    });
    const prepared=prepareBoundedScript({id:"duration-round-options",text},realm);
    if(prepared.kind!=="ready")throw new Error("prepare: "+text);
    const result=evaluateScript(createScriptSession(),prepared.record).completion;
    if(result.type!=="normal"||result.value.kind!=="boolean"||!result.value.value)throw new Error(text);
}
for(const text of [
 'roundOptions("minute")==="hours:minutes:1:halfExpand:none"',
 'roundOptions("day")==="days:days:1:halfExpand:none"',
 'roundOptions({largestUnit:"auto"})==="hours:nanoseconds:1:halfExpand:none"',
 'roundOptions({largestUnit:"day"})==="days:nanoseconds:1:halfExpand:none"',
 'roundOptions("second","P1Y")==="years:seconds:1:halfExpand:none"',
 'roundOptions("year","PT0S")==="years:years:1:halfExpand:none"',
 'roundOptions({smallestUnit:"day",roundingIncrement:1000000000})==="days:days:1000000000:halfExpand:none"',
 'roundOptions({smallestUnit:"hours",roundingIncrement:3.9})==="hours:hours:3:halfExpand:none"',
 'roundOptions({smallestUnit:"month",relativeTo:"2020-01-31"})==="months:months:1:halfExpand:2020-1-31"',
 'var log="";var o={get largestUnit(){log+="l";return{toString(){log+="L";return "day"}}},get relativeTo(){log+="r";return "2020-01-01"},get roundingIncrement(){log+="i";return{valueOf(){log+="I";return 3}}},get roundingMode(){log+="m";return{toString(){log+="M";return "ceil"}}},get smallestUnit(){log+="s";return{toString(){log+="S";return "hour"}}}};roundOptions(o)==="days:hours:3:ceil:2020-1-1"&&log==="lLriImMsS"',
 'var touched=false,ok=false;try{roundOptions({largestUnit:"bad",get relativeTo(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
 'var touched=false,ok=false;try{roundOptions({relativeTo:"bad",get roundingIncrement(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
 'var touched=false,ok=false;try{roundOptions({roundingIncrement:0,get roundingMode(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
 'var touched=false,ok=false;try{roundOptions({roundingMode:"bad",get smallestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
])passes(text);
for(const mode of ["ceil","floor","expand","trunc","halfCeil","halfFloor","halfExpand","halfTrunc","halfEven"])passes('roundOptions({smallestUnit:"second",roundingMode:"'+mode+'"})==="hours:seconds:1:'+mode+':none"');
const units=["year","month","week","day","hour","minute","second","millisecond","microsecond","nanosecond"];
for(let large=0;large<units.length;large++)for(let small=0;small<units.length;small++){
 const options='{largestUnit:"'+units[large]+'",smallestUnit:"'+units[small]+'"}';
 if(large<=small)passes('roundOptions('+options+')==="'+units[large]+'s:'+units[small]+'s:1:halfExpand:none"');
 else passes('var ok=false;try{roundOptions('+options+')}catch(e){ok=e instanceof RangeError}ok');
}
for(const options of ['undefined','null','1','true'])passes('var ok=false;try{roundOptions('+options+')}catch(e){ok=e instanceof TypeError}ok');
for(const options of ['{}','{smallestUnit:"auto"}','{largestUnit:"year",smallestUnit:"month",roundingIncrement:2}','{smallestUnit:"hour",roundingIncrement:24}','{smallestUnit:"minute",roundingIncrement:7}','{smallestUnit:"nanosecond",roundingIncrement:1000}','{smallestUnit:"day",roundingIncrement:1000000001}'])passes('var ok=false;try{roundOptions('+options+')}catch(e){ok=e instanceof RangeError}ok');
console.log("temporal duration round options passed");
