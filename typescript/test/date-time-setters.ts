import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-time-setters", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("completion: " + text);
    return result.value;
}
function passes(text: string): void { const value = run(text); if (value.kind !== "boolean" || !value.value) throw new Error(text); }
const suffixes = ["Hours", "Minutes", "Seconds", "Milliseconds"];
const expected = [3600000, 60000, 1000, 1];
for (let i = 0; i < suffixes.length; i++) for (const prefix of ["set", "setUTC"]) {
    const name = prefix + suffixes[i];
    passes('var d=new Date(0);d.'+name+'(1)==='+expected[i]+'&&d.getTime()==='+expected[i]);
    passes('var d=new Date(0);Number.isNaN(d.'+name+'())&&Number.isNaN(d.getTime())');
    passes('var d=new Date(NaN);Number.isNaN(d.'+name+'(1))&&Number.isNaN(d.getTime())');
    passes('Date.prototype.'+name+'.length==='+ (4-i)+'&&Date.prototype.'+name+'.name==="'+name+'"');
    passes('var d=new Date(NaN);var x={valueOf:function(){d.setTime(0);return 1}};Number.isNaN(d.'+name+'(x))&&d.getTime()===0');
    passes('var d=new Date(0);var x={valueOf:function(){d.setTime(86400000);return 1}};d.'+name+'(x)==='+expected[i]);
    passes('var calls=0,ok=false;try{Date.prototype.'+name+'.call({}, {valueOf:function(){calls++;return 1}})}catch(e){ok=e instanceof TypeError}ok&&calls===0');
}
for (const text of [
    'var d=new Date(0);d.setUTCHours(1,2,3,4)===3723004&&d.toISOString()==="1970-01-01T01:02:03.004Z"',
    'var d=new Date(3723004);d.setUTCHours(5)===18123004&&d.setUTCMinutes(6)===18363004&&d.setUTCSeconds(7)===18367004',
    'var d=new Date(0);Number.isNaN(d.setHours(1,undefined))&&Number.isNaN(d.getTime())',
    'var d=new Date(0);d.setUTCMilliseconds(-1.9)===-1&&d.toISOString()==="1969-12-31T23:59:59.999Z"',
    'var d=new Date(0);d.setUTCHours(24)===86400000&&d.setUTCMinutes(-60)===82800000',
    'var d=new Date(8640000000000000);Number.isNaN(d.setUTCMilliseconds(1))',
    'var d=new Date(-8640000000000000);Number.isNaN(d.setUTCSeconds(-1))',
    'var d=Object.freeze(new Date(0));d.setSeconds(2)===2000&&d.setTime(3)===3',
    'var d=new Date(NaN);d.setTime(1.9)===1&&d.getTime()===1',
    'var d=new Date(0);1/d.setTime(-0)===Infinity&&Number.isNaN(d.setTime())',
    'var d=new Date(0);Number.isNaN(d.setTime(Infinity))&&d.setTime(-8640000000000000)===-8640000000000000',
    'var d=new Date(0),log="";function x(n){return {valueOf:function(){log+=n;return n}}}d.setHours(x(1),x(2),x(3),x(4),x(5));log==="1234"&&d.getTime()===3723004',
    'var d=new Date(0),log="",ok=false;try{d.setHours({valueOf:function(){log+="h";return NaN}},{valueOf:function(){log+="m";throw 7}})}catch(e){ok=e===7}ok&&log==="hm"&&d.getTime()===0',
    'var d=new Date(NaN),calls=0;try{d.setHours(1,{valueOf:function(){calls++;throw 7}})}catch(e){}calls===1',
    'var d=new Date(0);try{d.setSeconds({valueOf:function(){d.setTime(9);throw 7}})}catch(e){}d.getTime()===9',
    'var d=new Date(0);try{d.setTime({valueOf:function(){d.setTime(9);throw 7}})}catch(e){}d.getTime()===9',
    'var d=new Date(0);var ok=false;try{d.setTime(1n)}catch(e){ok=e instanceof TypeError}ok&&d.getTime()===0',
    'var d=new Date(0);Object.setPrototypeOf(d,null);Date.prototype.setTime.call(d,7)===7',
    'Date.prototype.setHours!==Date.prototype.setUTCHours&&Date.prototype.setTime.length===1',
]) passes(text);
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("setter", { value: run("Date.prototype.setUTCHours", owner) });
caller.defineScriptGlobal("OwnerTypeError", { value: run("TypeError", owner) });
const cross = run('var ok=false;try{setter.call({})}catch(e){ok=e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok', caller);
if (cross.kind !== "boolean" || !cross.value) throw new Error("Date setter Realm");
console.log("date time setters passed");
