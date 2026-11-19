import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-date-time-parts", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("completion: " + text);
    return result.value;
}
function passes(text: string): void { const value=run(text);if(value.kind!=="boolean"||!value.value)throw new Error(text); }
const names=['toInstant','toPlainDate','toPlainTime','toPlainDateTime'],types=['Instant','PlainDate','PlainTime','PlainDateTime'],expected=['1969-12-31T23:59:59.999999999Z','1970-01-01','01:59:59.999999999','1970-01-01T01:59:59.999999999'];
for(let i=0;i<names.length;i++){
 const name=names[i];
 passes('var z=new Temporal.ZonedDateTime(-1n,"+02");var x=z.'+name+'();x instanceof Temporal.'+types[i]+'&&x.toString()==="'+expected[i]+'"&&x!==z.'+name+'()');
 passes('Date;Temporal.ZonedDateTime.prototype.'+name+'.length===0&&Temporal.ZonedDateTime.prototype.'+name+'.name==="'+name+'"');
 passes('var z=new Temporal.ZonedDateTime(0n,"UTC"),p=Temporal.'+types[i]+'.prototype;Temporal.'+types[i]+'=function(){throw 7};Object.getPrototypeOf(z.'+name+'())===p');
}
for(const name of [...names,'withTimeZone','withCalendar'])passes('var ok=false;try{Temporal.ZonedDateTime.prototype.'+name+'.call({}, {toString:function(){throw 7}})}catch(e){ok=e instanceof TypeError}ok');
for(const text of [
 'var z=new Temporal.ZonedDateTime(1n,"UTC"),x=z.withTimeZone("-03");x!==z&&x.epochNanoseconds===1n&&x.timeZoneId==="-03:00"&&x.toPlainDateTime().toString()==="1969-12-31T21:00:00.000000001"&&z.timeZoneId==="UTC"',
 'var z=new Temporal.ZonedDateTime(0n,"UTC");z.withTimeZone("2020-01-01T12Z[+02]").timeZoneId==="+02:00"',
 'var z=new Temporal.ZonedDateTime(1n,"UTC"),zone=new Temporal.ZonedDateTime(2n,"+02");Object.defineProperty(zone,"timeZoneId",{get:function(){throw 7}});z.withTimeZone(zone).timeZoneId==="+02:00"',
 'var z=new Temporal.ZonedDateTime(1n,"+02"),x=z.withCalendar("ISO8601");x!==z&&x.epochNanoseconds===1n&&x.timeZoneId==="+02:00"&&x.calendarId==="iso8601"',
 'var z=new Temporal.ZonedDateTime(1n,"UTC");Object.defineProperty(z,"calendar",{get:function(){throw 7}});z.withCalendar(z).calendarId==="iso8601"',
 'var z=new Temporal.ZonedDateTime(1n,"UTC");z.withCalendar("2020-01-01").calendarId==="iso8601"',
 'class Sub extends Temporal.ZonedDateTime{}var z=new Sub(0n,"UTC");Object.getPrototypeOf(z.withTimeZone("UTC"))===Temporal.ZonedDateTime.prototype&&Object.getPrototypeOf(z.withCalendar("iso8601"))===Temporal.ZonedDateTime.prototype',
 'var z=new Temporal.ZonedDateTime(8640000000000000000000n,"+23:59");z.toInstant().epochNanoseconds===8640000000000000000000n&&z.toPlainDateTime().toString()==="+275760-09-13T23:59:00"',
 'var z=new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59");z.toPlainDate().toString()==="-271821-04-19"&&z.toPlainTime().toString()==="00:01:00"',
])passes(text);
for(const name of ['withTimeZone','withCalendar']){
 passes('Temporal.ZonedDateTime.prototype.'+name+'.length===1');
 for(const value of ['undefined','null','{}','{toString:function(){throw 7}}'])passes('var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").'+name+'('+value+')}catch(e){ok=e instanceof TypeError}ok');
}
const owner=new Realm((_line:string)=>{},"script"),other=new Realm((_line:string)=>{},"script");
other.defineScriptGlobal("project",{value:run('Temporal.ZonedDateTime.prototype.toPlainDateTime',owner)});
other.defineScriptGlobal("replace",{value:run('Temporal.ZonedDateTime.prototype.withTimeZone',owner)});
other.defineScriptGlobal("ownerPlainPrototype",{value:run('Temporal.PlainDateTime.prototype',owner)});
other.defineScriptGlobal("ownerZonedPrototype",{value:run('Temporal.ZonedDateTime.prototype',owner)});
const cross=run('var z=new Temporal.ZonedDateTime(0n,"UTC");Object.getPrototypeOf(project.call(z))===ownerPlainPrototype&&Object.getPrototypeOf(replace.call(z,"+01"))===ownerZonedPrototype',other);
if(cross.kind!=="boolean"||!cross.value)throw new Error("Zoned projections Realm");
console.log("temporal zoned date time parts passed");
