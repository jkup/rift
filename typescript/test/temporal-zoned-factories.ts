import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm: Realm): Value {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-factories", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("completion: " + text);
    return result.value;
}
const realm=new Realm((_line:string)=>{},"script");let calls=0;realm.clockMilliseconds=()=>{calls++;return -1};
function passes(text: string): void { const value=run(text,realm);if(value.kind!=="boolean"||!value.value)throw new Error(text); }
for(const value of ['null','{}','new String("UTC")','{toString:function(){throw 7}}'])passes('var ok=false;try{Temporal.Now.zonedDateTimeISO('+value+')}catch(e){ok=e instanceof TypeError}ok');
passes('var ok=false;try{Temporal.Now.zonedDateTimeISO("Invalid/Zone")}catch(e){ok=e instanceof RangeError}ok');
if(calls!==0)throw new Error("zone validation before clock");
for(const text of [
 'var z=Temporal.Now.zonedDateTimeISO();z instanceof Temporal.ZonedDateTime&&z.epochNanoseconds===-1000000n&&z.timeZoneId==="UTC"&&z.calendarId==="iso8601"',
 'var z=Temporal.Now.zonedDateTimeISO("+02");z.epochNanoseconds===-1000000n&&z.day===1&&z.hour===1&&z.minute===59',
 'Temporal.Now.zonedDateTimeISO.call(null,undefined,{}).timeZoneId==="UTC"',
 'Temporal.Now.zonedDateTimeISO()!==Temporal.Now.zonedDateTimeISO()',
 'var i=new Temporal.Instant(-1n),z=i.toZonedDateTimeISO("-01");z.epochNanoseconds===-1n&&z.day===31&&z.hour===22&&z.nanosecond===999&&z!==i.toZonedDateTimeISO("-01")',
 'new Temporal.Instant(1n).toZonedDateTimeISO("2030-12-25T00Z[+02]").epochNanoseconds===1n',
 'var zone=new Temporal.ZonedDateTime(7n,"+03");Object.defineProperty(zone,"timeZone",{get:function(){throw 7}});new Temporal.Instant(1n).toZonedDateTimeISO(zone).timeZoneId==="+03:00"&&Temporal.Now.zonedDateTimeISO(zone).timeZoneId==="+03:00"',
 'var ok=false;try{Temporal.Instant.prototype.toZonedDateTimeISO.call({},"bad")}catch(e){ok=e instanceof TypeError}ok',
 'Temporal.Now.zonedDateTimeISO.length===0&&Temporal.Now.zonedDateTimeISO.name==="zonedDateTimeISO"&&Temporal.Instant.prototype.toZonedDateTimeISO.length===1&&Temporal.Instant.prototype.toZonedDateTimeISO.name==="toZonedDateTimeISO"',
 'new Temporal.Instant(8640000000000000000000n).toZonedDateTimeISO("+23:59").hour===23',
 'new Temporal.Instant(-8640000000000000000000n).toZonedDateTimeISO("-23:59").day===19',
])passes(text);
for(const value of ['undefined','null','{}','{toString:function(){throw 7}}'])passes('var ok=false;try{new Temporal.Instant(0n).toZonedDateTimeISO('+value+')}catch(e){ok=e instanceof TypeError}ok');
passes('var p=Temporal.ZonedDateTime.prototype;Temporal.ZonedDateTime=function(){throw 7};Object.getPrototypeOf(Temporal.Now.zonedDateTimeISO())===p&&Object.getPrototypeOf(new Temporal.Instant(0n).toZonedDateTimeISO("UTC"))===p');
const other=new Realm((_line:string)=>{},"script");other.clockMilliseconds=()=>7;
other.defineScriptGlobal("now",{value:run('Temporal.Now.zonedDateTimeISO',realm)});
other.defineScriptGlobal("project",{value:run('Temporal.Instant.prototype.toZonedDateTimeISO',realm)});
other.defineScriptGlobal("ownerPrototype",{value:run('Object.getPrototypeOf(Temporal.Now.zonedDateTimeISO())',realm)});
const cross=run('var a=now(),b=project.call(new Temporal.Instant(3n),"UTC");a.epochNanoseconds===-1000000n&&b.epochNanoseconds===3n&&Object.getPrototypeOf(a)===ownerPrototype&&Object.getPrototypeOf(b)===ownerPrototype&&!(a instanceof Temporal.ZonedDateTime)',other);
if(cross.kind!=="boolean"||!cross.value)throw new Error("Zoned factory Realm");
console.log("temporal zoned factories passed");
