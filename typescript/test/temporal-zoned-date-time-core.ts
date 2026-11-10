import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-date-time-core", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("completion: " + text);
    return result.value;
}
function passes(text: string): void { const value=run(text);if(value.kind!=="boolean"||!value.value)throw new Error(text); }
for(const text of [
 'var z=new Temporal.ZonedDateTime(1n,"utc");z.epochNanoseconds===1n&&z.epochMilliseconds===0&&z.timeZoneId==="UTC"&&z.calendarId==="iso8601"',
 'new Temporal.ZonedDateTime(-1n,"+00").epochMilliseconds===-1',
 'new Temporal.ZonedDateTime(-1000001n,"-00").epochMilliseconds===-2',
 'new Temporal.ZonedDateTime("123","-2359","ISO8601").epochNanoseconds===123n',
 'new Temporal.ZonedDateTime(true,"+01").epochNanoseconds===1n',
 'new Temporal.ZonedDateTime(0n,"-00").timeZoneId==="+00:00"',
 'new Temporal.ZonedDateTime(8640000000000000000000n,"+23:59").epochMilliseconds===8640000000000000',
 'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").epochMilliseconds===-8640000000000000',
 'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.getPrototypeOf(z)===Temporal.ZonedDateTime.prototype&&Object.keys(z).length===0&&Object.prototype.toString.call(z)==="[object Temporal.ZonedDateTime]"',
 'Temporal.ZonedDateTime.name==="ZonedDateTime"&&Temporal.ZonedDateTime.length===2&&Object.getPrototypeOf(Temporal.ZonedDateTime)===Function.prototype',
 'var p=Temporal.ZonedDateTime.prototype,d=Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime,"prototype");p.constructor===Temporal.ZonedDateTime&&Object.getPrototypeOf(p)===Object.prototype&&!d.writable&&!d.enumerable&&!d.configurable',
 'class Sub extends Temporal.ZonedDateTime{}var z=new Sub(7n,"UTC");z instanceof Sub&&z instanceof Temporal.ZonedDateTime&&z.epochNanoseconds===7n',
 'function Target(){}var z=Reflect.construct(Temporal.ZonedDateTime,[7n,"UTC"],Target);Object.getPrototypeOf(z)===Target.prototype&&Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"epochNanoseconds").get.call(z)===7n',
 'function Target(){}Target.prototype=null;Object.getPrototypeOf(Reflect.construct(Temporal.ZonedDateTime,[0n,"UTC"],Target))===Temporal.ZonedDateTime.prototype',
 'var log="",Target=(function(){}).bind(null);Object.defineProperty(Target,"prototype",{get:function(){log+="P";return {}}});Reflect.construct(Temporal.ZonedDateTime,[{valueOf:function(){log+="E";return 1n}},"UTC"],Target);log==="EP"',
 'var calls=0,ok=false;try{Temporal.ZonedDateTime({valueOf:function(){calls++;return 1n}},"UTC")}catch(e){ok=e instanceof TypeError}ok&&calls===0',
 'var ok=false;try{new Temporal.ZonedDateTime({valueOf:function(){throw 7}},null)}catch(e){ok=e===7}ok',
 'var ok=false;try{new Temporal.ZonedDateTime(8640000000000000000001n,null)}catch(e){ok=e instanceof RangeError}ok',
 'var z=new Temporal.ZonedDateTime(0n,"UTC"),ok=false;try{+z}catch(e){ok=e instanceof TypeError}ok',
 'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"calendar",{get:function(){throw 7}});new Temporal.PlainDate(2020,1,1).withCalendar(z).calendarId==="iso8601"',
 'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"calendar",{get:function(){throw 7}});var ok=false;try{new Temporal.PlainDate(2020,1,1).with(z)}catch(e){ok=e instanceof TypeError}ok',
])passes(text);
for(const argumentsText of ['0,"UTC"','0n','0n,null','0n,new String("UTC")','0n,{toString:function(){throw 7}}','0n,"UTC",null','0n,"UTC",{}'])passes('var ok=false;try{new Temporal.ZonedDateTime('+argumentsText+')}catch(e){ok=e instanceof TypeError}ok');
for(const zone of ['Z','Etc/UTC','Europe/London','+24','+01:00:00','2020-01-01T00Z','2020-01[UTC]'])passes('var ok=false;try{new Temporal.ZonedDateTime(0n,"'+zone+'",null)}catch(e){ok=e instanceof RangeError}ok');
for(const calendar of ['hebrew','2020-01-01',''])passes('var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC","'+calendar+'")}catch(e){ok=e instanceof RangeError}ok');
for(const name of ['epochNanoseconds','epochMilliseconds','timeZoneId','calendarId']){
 passes('var d=Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"'+name+'");d.get.name==="get '+name+'"&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable');
 for(const receiver of ['{}','Temporal.ZonedDateTime.prototype','new Temporal.Instant(0n)'])passes('var ok=false;try{Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"'+name+'").get.call('+receiver+')}catch(e){ok=e instanceof TypeError}ok');
}
const owner=new Realm((_line:string)=>{},"script"),other=new Realm((_line:string)=>{},"script");other.clockMilliseconds=()=>0;
other.defineScriptGlobal("C",{value:run('Temporal.ZonedDateTime',owner)});
other.defineScriptGlobal("OwnerTypeError",{value:run('TypeError',owner)});
other.defineScriptGlobal("ownerPrototype",{value:run('Temporal.ZonedDateTime.prototype',owner)});
const cross=run('var z=new C(1n,"+01");var ok=Object.getPrototypeOf(z)===ownerPrototype&&!(z instanceof Temporal.ZonedDateTime);function Target(){}Target.prototype=null;ok=ok&&Object.getPrototypeOf(Reflect.construct(C,[0n,"UTC"],Target))===Temporal.ZonedDateTime.prototype;try{new C(0,"UTC")}catch(e){ok=ok&&e instanceof OwnerTypeError&&!(e instanceof TypeError)}Object.defineProperty(z,"timeZone",{get:function(){throw 7}});Object.defineProperty(z,"timeZoneId",{get:function(){throw 8}});ok&&Temporal.Now.plainTimeISO(z).toString()==="01:00:00"',other);
if(cross.kind!=="boolean"||!cross.value)throw new Error("ZonedDateTime Realm");
console.log("temporal zoned date time core passed");
