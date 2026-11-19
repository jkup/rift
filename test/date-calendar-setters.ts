import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-calendar-setters", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("completion: " + text);
    return result.value;
}
function passes(text: string): void { const value = run(text); if (value.kind !== "boolean" || !value.value) throw new Error(text); }
const suffixes = ["FullYear", "Month", "Date"];
for (let i = 0; i < suffixes.length; i++) for (const prefix of ["set", "setUTC"]) {
    const name = prefix + suffixes[i];
    passes('Date.prototype.'+name+'.length==='+ (3-i)+'&&Date.prototype.'+name+'.name==="'+name+'"');
    passes('var d=new Date(0);Number.isNaN(d.'+name+'())&&Number.isNaN(d.getTime())');
    passes('var calls=0,ok=false;try{Date.prototype.'+name+'.call({}, {valueOf:function(){calls++;return 1}})}catch(e){ok=e instanceof TypeError}ok&&calls===0');
    passes('var d=new Date(0);try{d.'+name+'({valueOf:function(){d.setTime(7);throw 9}})}catch(e){}d.getTime()===7');
    if (i !== 0) passes('var d=new Date(NaN);Number.isNaN(d.'+name+'({valueOf:function(){d.setTime(7);return 1}}))&&d.getTime()===7');
}
for (const prefix of ["set", "setUTC"]) for (const text of [
    'var d=new Date(NaN);d.METHODFullYear(2000)===946684800000&&d.toISOString()==="2000-01-01T00:00:00.000Z"',
    'var d=new Date(0);d.METHODFullYear(0);d.toISOString()==="0000-01-01T00:00:00.000Z"',
    'var d=new Date(0);d.METHODFullYear(99);d.getUTCFullYear()===99',
    'var d=new Date("2020-02-29T12:34:56.789Z");d.METHODFullYear(2021);d.toISOString()==="2021-03-01T12:34:56.789Z"',
    'var d=new Date("2020-01-31T12:34:56.789Z");d.METHODMonth(1);d.toISOString()==="2020-03-02T12:34:56.789Z"',
    'var d=new Date(0);d.METHODMonth(-1,0);d.toISOString()==="1969-11-30T00:00:00.000Z"',
    'var d=new Date(-1);d.METHODDate(1);d.toISOString()==="1969-12-01T23:59:59.999Z"',
    'var d=new Date(0);Number.isNaN(d.METHODFullYear(2000,undefined))&&Number.isNaN(d.getTime())',
    'var d=new Date(0);Number.isNaN(d.METHODMonth(1,undefined))&&Number.isNaN(d.getTime())',
    'var d=new Date(0);d.METHODFullYear({valueOf:function(){d.setTime(123456789);return 2000}});d.toISOString()==="2000-01-01T00:00:00.000Z"',
    'var d=new Date(NaN);d.METHODFullYear({valueOf:function(){d.setTime(123456789);return 2000}});d.toISOString()==="2000-01-01T00:00:00.000Z"',
    'var d=new Date(0),log="";function x(n){return {valueOf:function(){log+=n;return n}}}d.METHODFullYear(x(2000),x(1),x(2),x(3));log==="200012"&&d.toISOString()==="2000-02-02T00:00:00.000Z"',
    'var d=new Date(0),ok=false;try{d.METHODFullYear(NaN,{valueOf:function(){throw 7}})}catch(e){ok=e===7}ok&&d.getTime()===0',
    'var d=new Date(NaN),ok=false;try{d.METHODMonth(1,{valueOf:function(){throw 7}})}catch(e){ok=e===7}ok&&Number.isNaN(d.getTime())',
    'var d=Object.freeze(new Date(0));d.METHODDate(2)===86400000',
    'var d=new Date(8640000000000000);Number.isNaN(d.METHODDate(14))',
    'var d=new Date(-8640000000000000);Number.isNaN(d.METHODDate(19))',
    'var d=new Date(0);d.METHODDate(2.9)===86400000',
]) passes(text.split("METHOD").join(prefix));
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("setter", { value: run("Date.prototype.setUTCFullYear", owner) });
caller.defineScriptGlobal("OwnerTypeError", { value: run("TypeError", owner) });
const cross = run('var ok=false;try{setter.call(new Date(0),1n)}catch(e){ok=e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok', caller);
if (cross.kind !== "boolean" || !cross.value) throw new Error("Date calendar setter Realm");
console.log("date calendar setters passed");
