import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "date-time-core", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}

for (const text of [
 'new Temporal.PlainDateTime(2024,2,29,12,34,56,123,450).toString()==="2024-02-29T12:34:56.12345"',
 'new Temporal.PlainDateTime(-1,1,1).toString()==="-000001-01-01T00:00:00"',
 'new Temporal.PlainDateTime(10000,1,1).toString()==="+010000-01-01T00:00:00"',
 'new Temporal.PlainDateTime(0,1,1).toString()==="0000-01-01T00:00:00"',
 'new Temporal.PlainDateTime(2024,1,1).toString({calendarName:"always"})==="2024-01-01T00:00:00[u-ca=iso8601]"',
 'new Temporal.PlainDateTime(2024,1,1).toString({calendarName:"critical"})==="2024-01-01T00:00:00[!u-ca=iso8601]"',
 'new Temporal.PlainDateTime(2024,1,1).toString({fractionalSecondDigits:9})==="2024-01-01T00:00:00.000000000"',
 'new Temporal.PlainDateTime(2024,1,1,12,34,59,999).toString({smallestUnit:"minutes"})==="2024-01-01T12:34"',
 'new Temporal.PlainDateTime(2024,1,1,12,34,59,999).toString({fractionalSecondDigits:9,smallestUnit:"second"})==="2024-01-01T12:34:59"',
 'new Temporal.PlainDateTime(2024,2,28,23,59,59,999).toString({smallestUnit:"second",roundingMode:"ceil"})==="2024-02-29T00:00:00"',
 'new Temporal.PlainDateTime(2023,12,31,23,59,59,999).toString({smallestUnit:"second",roundingMode:"ceil"})==="2024-01-01T00:00:00"',
 'new Temporal.PlainDateTime(1969,12,31,23,59,59,500).toString({smallestUnit:"second",roundingMode:"trunc"})==="1969-12-31T23:59:59"',
 'new Temporal.PlainDateTime(1969,12,31,23,59,59,500).toString({smallestUnit:"second",roundingMode:"expand"})==="1970-01-01T00:00:00"',
 'new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).toJSON()==="-271821-04-19T00:00:00.000000001"',
 'new Temporal.PlainDateTime(275760,9,13,23,59,59,999,999,999).toString()==="+275760-09-13T23:59:59.999999999"',
 'var log="";new Temporal.PlainDateTime(2024,1,1).toString({get calendarName(){log+="c";return{toString(){log+="C";return"auto"}}},get fractionalSecondDigits(){log+="d";return 3},get roundingMode(){log+="r";return{toString(){log+="R";return"trunc"}}},get smallestUnit(){log+="s";return{toString(){log+="S";return"second"}}}});log==="cCdrRsS"',
 'var touched=false,ok=false;try{Temporal.PlainDateTime.prototype.toString.call({}, {get calendarName(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
 'var touched=false,ok=false;try{new Temporal.PlainDateTime(2024,1,1).toString({calendarName:"bad",get fractionalSecondDigits(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
 'var d=new Temporal.PlainDateTime(2024,1,1);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"second",{get(){throw 2}});d.toString()==="2024-01-01T00:00:00"',
]) passes(text);
const modes=['ceil','floor','expand','trunc','halfCeil','halfFloor','halfExpand','halfTrunc','halfEven'];
const up=[true,false,true,false,true,false,true,false,false];
for(let i=0;i<modes.length;i++) passes('new Temporal.PlainDateTime(1900,1,1,0,0,2,500).toString({smallestUnit:"second",roundingMode:"'+modes[i]+'"})==="1900-01-01T00:00:0'+(up[i]?3:2)+'"');
for(const args of ['-271821,4,19,0,0,0,0,0,1','275760,9,13,23,59,59,999,999,999']) passes('var ok=false;try{new Temporal.PlainDateTime('+args+').toString({smallestUnit:"second",roundingMode:"'+(args[0]==='-'?'trunc':'ceil')+'"})}catch(e){ok=e instanceof RangeError}ok');
for(const options of ['null','1','true','"auto"']) passes('var ok=false;try{new Temporal.PlainDateTime(2024,1,1).toString('+options+')}catch(e){ok=e instanceof TypeError}ok');
for(const options of ['{smallestUnit:"hour"}','{smallestUnit:"day"}','{smallestUnit:"auto"}','{fractionalSecondDigits:10}','{fractionalSecondDigits:"3"}','{roundingMode:"bad"}','{calendarName:null}']) passes('var ok=false;try{new Temporal.PlainDateTime(2024,1,1).toString('+options+')}catch(e){ok=e instanceof RangeError}ok');
for(const method of ['toJSON','toLocaleString']) passes('var d=new Temporal.PlainDateTime(2024,1,1);d.toString=function(){throw 1};d.'+method+'({get calendarName(){throw 2}},null)==="2024-01-01T00:00:00"');
for(const method of ['toString','toJSON','toLocaleString']) {
 passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable');
 passes('var ok=false;try{Temporal.PlainDateTime.prototype.'+method+'.call(Temporal.PlainDateTime.prototype)}catch(e){ok=e instanceof TypeError}ok');
 const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
 const fn=run('Temporal.PlainDateTime.prototype.'+method,defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("format",{value:fn.value});
 const result=run('format.call(new Temporal.PlainDateTime(2024,1,1))',calling);check(result.type==="normal"&&result.value.kind==="string"&&result.value.value==="2024-01-01T00:00:00","cross-Realm receiver");
 const failed=run('format.call({})',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
}
console.log("temporal plain date time format passed");
