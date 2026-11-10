import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { temporalRelativeToOption } from "../src/temporal-relative-to-option.js";
import { normal, UNDEFINED, type ValueCompletion } from "../src/runtime.js";
function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    realm.registerBuiltin(realm.globalObject, "relative", 1, (_receiver, args, context, loc): ValueCompletion => {
        const result = temporalRelativeToOption(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (result.type === "throw") return result;
        const date = result.value;
        return normal({ kind: "string", value: date === null ? "none" : date.year+":"+date.month+":"+date.day });
    });
    const prepared = prepareBoundedScript({ id: "relative-option", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error(text);
}
for(const text of [
 'relative()==="none"&&relative({})==="none"&&relative({relativeTo:undefined})==="none"',
 'relative({relativeTo:"2020-02-29"})==="2020:2:29"',
 'relative({relativeTo:"20200229T235960.123456789+0130[u-ca=ISO8601]"})==="2020:2:29"',
 'relative({relativeTo:"2020-02-29T23:59:59.999999999-23:59"})==="2020:2:29"',
 'relative({relativeTo:{year:2020,month:2,day:31,hour:100,minute:-3}})==="2020:2:29"',
 'relative({relativeTo:{year:2020,monthCode:"M02",day:29,offset:{toString(){return "+01:23:45.123456789"}}}})==="2020:2:29"',
 'relative({relativeTo:"-271821-04-19T00:00"})==="-271821:4:19"',
 'relative({relativeTo:"+275760-09-13T23:59:59.999999999"})==="275760:9:13"',
 'var d=new Temporal.PlainDate(2020,2,29);Object.defineProperty(d,"calendar",{get(){throw 1}});Object.defineProperty(d,"year",{get(){throw 2}});relative({relativeTo:d})==="2020:2:29"',
 'var d=new Temporal.PlainDateTime(2020,2,29,23);Object.defineProperty(d,"day",{get(){throw 1}});relative({relativeTo:d})==="2020:2:29"',
 'relative({relativeTo:{year:2020,month:2,day:29},get overflow(){throw 1}})==="2020:2:29"',
 'var log="";var o={};for(var k of ["calendar","day","hour","microsecond","millisecond","minute","month","monthCode","nanosecond","offset","second","timeZone","year"]){let key=k;Object.defineProperty(o,key,{get(){log+=key+",";if(key==="day")return 29;if(key==="month")return 2;if(key==="year")return 2020}})}relative({get relativeTo(){log+="relativeTo,";return o}})==="2020:2:29"&&log==="relativeTo,calendar,day,hour,microsecond,millisecond,minute,month,monthCode,nanosecond,offset,second,timeZone,year,"',
 'var touched=false,ok=false;try{relative({relativeTo:{day:1,hour:Infinity,get year(){touched=true}}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
 'var touched=false,ok=false;try{relative({relativeTo:{day:1,offset:"bad",get second(){touched=true}}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
 'var ok=false;try{relative({relativeTo:{get offset(){throw 42}}})}catch(e){ok=e===42}ok',
 'var ok=false;try{relative({get relativeTo(){throw 43}})}catch(e){ok=e===43}ok',
 'var touched=false,ok=false;try{relative({relativeTo:{timeZone:{toString(){touched=true;return "UTC"}}}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
]) passes(text);
for(const value of ['null','1','true','"x"']) passes('var ok=false;try{relative('+value+')}catch(e){ok=e instanceof TypeError}ok');
for(const value of ['null','1','true','1n','Symbol()']) passes('var ok=false;try{relative({relativeTo:'+value+'})}catch(e){ok=e instanceof TypeError}ok');
for(const value of ['"2021-02-29"','"2020-01-01T24:00"','"2020-01-01T00:00Z"','"2020-01-01[UTC]"','"2020-01-01[+01:00]"','"2020-01-01[u-ca=hebrew]"','"-271821-04-18"','"+275760-09-14"','{year:2020,month:0,day:1}','{year:2020,month:2,day:1,second:Infinity}','{year:2020,month:2,day:1,offset:"+24:00"}','{year:2020,month:2,day:1,timeZone:"UTC"}']) passes('var ok=false;try{relative({relativeTo:'+value+'})}catch(e){ok=e instanceof RangeError}ok');
for(const value of ['{}','{year:2020,month:2}','{year:2020,month:2,day:1,offset:1}','{year:2020,month:2,day:1,hour:1n}']) passes('var ok=false;try{relative({relativeTo:'+value+'})}catch(e){ok=e instanceof TypeError}ok');
console.log("temporal relative to option passed");
