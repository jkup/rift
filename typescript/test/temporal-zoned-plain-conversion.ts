import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-plain-conversion", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const setup = 'var z=new Temporal.ZonedDateTime(-1n,"-01:30");for(var k of ["calendarId","timeZoneId","year","month","monthCode","day","hour","minute","second","millisecond","microsecond","nanosecond"]){Object.defineProperty(z,k,{get(){throw 1}})}z.toString=function(){throw 2};';
const cases = [
    'Temporal.PlainTime.from(z).toString()==="22:29:59.999999999"',
    'Temporal.PlainDate.from(z).toString()==="1969-12-31"',
    'Temporal.PlainDateTime.from(z).toString()==="1969-12-31T22:29:59.999999999"',
    'Temporal.PlainTime.compare(z,"22:30")===-1',
    'Temporal.PlainDate.compare(z,"1970-01-01")===-1',
    'Temporal.PlainDateTime.compare(z,"1969-12-31T22:30")===-1',
    'Temporal.PlainTime.from("22:29:59.999999999").equals(z)',
    'Temporal.PlainDate.from("1969-12-31").equals(z)',
    'Temporal.PlainDateTime.from("1969-12-31T22:29:59.999999999").equals(z)',
    'var t="";Temporal.PlainTime.from(z,{get overflow(){t+="O";return{toString(){t+="o";return "reject"}}}});t==="Oo"',
    'var t="";Temporal.PlainDate.from(z,{get overflow(){t+="O";return "constrain"}});t==="O"',
    'var t="";Temporal.PlainDateTime.from(z,{get overflow(){t+="O";return "reject"}});t==="O"',
    'Object.setPrototypeOf(z,null);Temporal.PlainDate.from(z).year===1969',
    'var d=new Temporal.PlainDateTime(2000,1,1);d.withPlainTime(z).toString()==="2000-01-01T22:29:59.999999999"',
];
for (const text of cases) {
    const result = run(setup + text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const name of ["PlainTime", "PlainDate", "PlainDateTime"]) {
    const result = run(setup+'var ok=false;try{Temporal.'+name+'.from(z,{overflow:"bad"})}catch(e){ok=e instanceof RangeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, name + " overflow");
    const fresh = run('class Z extends Temporal.ZonedDateTime{};var z=new Z(0n,"UTC"),x=Temporal.'+name+'.from(z),y=Temporal.'+name+'.from(z);x!==y&&Object.getPrototypeOf(x)===Temporal.'+name+'.prototype');
    check(fresh.type === "normal" && fresh.value.kind === "boolean" && fresh.value.value, name + " intrinsic");
}
const boundary = run('var z=new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59");Temporal.PlainTime.from(z).toString()==="00:01:00"&&Temporal.PlainDate.from(z).toString()==="-271821-04-19"&&Temporal.PlainDateTime.from(z).toString()==="-271821-04-19T00:01:00"');
check(boundary.type === "normal" && boundary.value.kind === "boolean" && boundary.value.value, "extended local minimum");
for (const name of ["PlainTime", "PlainDate", "PlainDateTime"]) {
    const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
    const method = run("Temporal."+name+".from", defining), prototype = run("Temporal."+name+".prototype", defining);
    if (method.type !== "normal" || prototype.type !== "normal") throw new Error("lookup");
    calling.defineScriptGlobal("convert", { value: method.value });
    const value = run('convert(new Temporal.ZonedDateTime(0n,"UTC"))', calling);
    check(value.type === "normal" && value.value.kind === "object" && prototype.value.kind === "object" && value.value.object.getPrototypeOf() === prototype.value.object, name + " defining Realm");
}
console.log("temporal zoned plain conversion passed");
