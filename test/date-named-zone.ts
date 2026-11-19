import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
import { parseDateString } from "../src/date-string-parse.js";
import { formatDateString } from "../src/date-format.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal/temporal-time-zone-parse.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm: Realm): Value {
    const prepared = prepareBoundedScript({ id: "date-named-zone", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("preparation: " + text);
    }
    const session = createScriptSession(),
        result = evaluateScript(session, prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("completion: " + text);
    }
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
    return result.value;
}
function passes(text: string, name = "America/New_York"): void {
    const value = run(text, new Realm((_line: string) => {}, "script", name));
    check(value.kind === "boolean" && value.value, name + ": " + text);
}
for (const [name, source] of [
    ["UTC", "new Date(1970,0,1).getTime()===0"],
    ["America/New_York", "new Date(2024,2,10,2,30).getTime()===1710055800000"],
    ["America/New_York", "new Date(2024,10,3,1,30).getTime()===1730611800000"],
    ["Australia/Lord_Howe", "new Date(2024,9,6,2,15).getTime()===1728143100000"],
    ["Australia/Lord_Howe", "new Date(2024,3,7,1,45).getTime()===1712414700000"],
    ["Pacific/Apia", "new Date(2011,11,30,12).getTime()===1325282400000"],
    ["Asia/Kathmandu", "new Date(1986,0,1,0,10).getTime()===504902400000"],
    ["Europe/Paris", "new Date(1900,0,1).getTime()===-2208989361000"],
    ["Europe/London", "new Date(1970,0,1).getTime()===-3600000"],
    ["Europe/London", "new Date(275760,8,13,1).getTime()===8640000000000000"],
    ["Europe/London", "Number.isNaN(new Date(275760,8,13,1,0,0,1).getTime())"],
    ["America/New_York", "new Date(-271821,3,19,19,3,58).getTime()===-8640000000000000"],
    ["America/New_York", "Number.isNaN(new Date(-271821,3,19,19,3,57,999).getTime())"],
    ["Europe/Paris", "new Date(-271821,3,20,0,9,21).getTime()===-8640000000000000"],
    [
        "+05:30",
        "new Date(1970,0,1).getTime()===-19800000&&new Date(0).getHours()===5&&new Date(0).getMinutes()===30",
    ],
]) {
    passes(source, name);
}
for (const source of [
    "new Date(0).getTime()===0&&new Date(0).getHours()===19&&new Date(0).getUTCDate()===1&&new Date(0).getDate()===31&&new Date(0).getYear()===69",
    'Date.UTC(1970,0,1)===0&&new Date("1970-01-01").getTime()===0&&Date.parse("1970-01-01T00:00:00")===18000000',
    'Date.parse("2024-03-10T02:30:00")===1710055800000&&Date.parse("2024-03-10T02:30:00-04:00")===1710052200000',
    "var d=new Date(0);d[Symbol.toPrimitive]=function(){throw 1};new Date(d).getTime()===0",
    'var d=new Date(NaN);d.toString()==="Invalid Date"&&Number.isNaN(d.getTimezoneOffset())&&Number.isNaN(d.getHours())',
    'var d=new Date("2024-03-10T06:30:00Z"),log="";d.setHours({valueOf(){log+="h";d.setTime(0);return 2}},{valueOf(){log+="m";return 30}});log==="hm"&&d.toISOString()==="2024-03-10T07:30:00.000Z"',
    'var d=new Date("2024-11-03T05:30:00Z");d.setFullYear({valueOf(){d.setTime(0);return 2025}});d.toISOString()==="2025-11-03T06:30:00.000Z"',
    'var d=new Date(NaN);d.setFullYear({valueOf(){d.setTime(123);return 2024}});d.toISOString()==="2024-01-01T05:00:00.000Z"',
    'var d=new Date(NaN);d.setYear(120);d.toISOString()==="0120-01-01T04:56:02.000Z"',
    'var d=new Date(NaN),log="";var t=d.setHours({valueOf(){log+="h";d.setTime(0);return 2}},{valueOf(){log+="m";return 30}});log==="hm"&&Number.isNaN(t)&&d.getTime()===0',
    "var d=new Date(0),caught=false;try{d.setHours({valueOf(){d.setTime(7);throw 8}})}catch(e){caught=e===8}caught&&d.getTime()===7",
    'var d=new Date("2024-11-03T06:30:00Z");d.setHours(1);d.toISOString()==="2024-11-03T05:30:00.000Z"',
    'var d=new Date("2024-03-10T06:30:00Z");d.setUTCHours(2);d.toISOString()==="2024-03-10T02:30:00.000Z"',
    'var d=new Date("2024-03-10T06:30:00Z");d.setMinutes(90);d.toISOString()==="2024-03-10T07:30:00.000Z"',
    'var d=new Date("2024-03-10T06:30:00Z");d.setSeconds(3600);d.toISOString()==="2024-03-10T07:30:00.000Z"',
    'var d=new Date("2024-03-10T06:30:00Z");d.setMilliseconds(3600000);d.toISOString()==="2024-03-10T07:30:00.000Z"',
    'var d=new Date("2024-03-10T06:30:00Z");d.setDate(11);d.toISOString()==="2024-03-11T05:30:00.000Z"',
    'var d=new Date("2024-03-10T06:30:00Z");d.setMonth(3);d.toISOString()==="2024-04-10T05:30:00.000Z"',
    'var d=new Date("2024-03-10T06:30:00Z");d.setYear(2025);d.toISOString()==="2025-03-10T05:30:00.000Z"',
    "var d=new Date(0);d.toLocaleString()===d.toString()&&d.toLocaleDateString()===d.toDateString()&&d.toLocaleTimeString()===d.toTimeString()",
    'var d=new Date(0);d.toUTCString()==="Thu, 01 Jan 1970 00:00:00 GMT"&&d.toISOString()==="1970-01-01T00:00:00.000Z"&&d.toTemporalInstant().epochNanoseconds===0n',
]) {
    passes(source);
}
passes(
    "var d=new Date(-2208988800000);d.getHours()===0&&d.getMinutes()===9&&d.getSeconds()===21&&d.getTimezoneOffset()===-9.35",
    "Europe/Paris",
);
passes(
    "var d=new Date(8640000000000000);d.setHours(1);d.setDate(13);d.setFullYear(275760);d.getTime()===8640000000000000",
    "Europe/London",
);
passes("var d=new Date(-8640000000000000);d.setHours(19,3,58);d.getTime()===-8640000000000000");
passes("Object.is(new Date(-0).getTimezoneOffset(),0)", "UTC");
for (const name of [
    "UTC",
    "Europe/Paris",
    "America/New_York",
    "Africa/Monrovia",
    "Asia/Kathmandu",
    "Europe/London",
    "+23:59",
    "-23:59",
]) {
    const zone = parseTemporalTimeZoneIdentifier(name);
    if (zone === null) {
        throw new Error("test zone");
    }
    for (const time of [
        -8640000000000000, -5364662400000, -2208988800000, -1000, 0, 8640000000000000,
    ]) {
        const text = formatDateString(time, "display", zone);
        check(parseDateString(text) === time, name + " display round trip: " + text);
        check(
            parseDateString(formatDateString(time, "utc", zone)) === time,
            name + " UTC round trip",
        );
    }
}
const paris = parseTemporalTimeZoneIdentifier("Europe/Paris");
if (paris === null) {
    throw new Error("Paris zone");
}
check(
    formatDateString(-2208988800000, "display", paris) ===
        "Mon Jan 01 1900 00:09:21 GMT+0009 (UTC+00:09:21)",
    "precise historical label",
);
for (const suffix of [
    "+0009 (UTC+00:08:21)",
    "+0009 (UTC-00:09:21)",
    "+0009 (UTC+00:09:60)",
    "+0009 (UTC+00:09:21.0)",
    "+0009 (Not/AZone)",
    "+2400",
    "+0009 ()",
    "+0009 (UTC+00:09:21))",
    "+0100 (Coordinated Universal Time)",
]) {
    check(
        Number.isNaN(parseDateString("Mon Jan 01 1900 00:09:21 GMT" + suffix)),
        "invalid display label: " + suffix,
    );
}
for (const name of [
    "",
    " ",
    "Not/AZone",
    "UTC+01:00",
    "2024-01-01T00:00Z",
    "2024-01-01[Europe/London]",
    "+24:00",
    "+01:00:30",
    "Europe/ London",
    "Europe/London\0",
]) {
    let rejected = false;
    try {
        new Realm(
            (_line: string) => {
                throw new Error("invalid configuration executed guest output");
            },
            "script",
            name,
        );
    } catch (error) {
        rejected = error instanceof RangeError;
    }
    check(rejected, "invalid configuration: " + name);
}
for (const name of [
    "UTC",
    "utc",
    "Etc/UTC",
    "Europe/London",
    "europe/london",
    "US/Eastern",
    "+0530",
    "+05:30",
    "-00:00",
]) {
    passes("Number.isFinite(new Date(0).getHours())", name);
}
const owner = new Realm((_line: string) => {}, "script", "America/New_York"),
    caller = new Realm((_line: string) => {}, "script", "Asia/Tokyo");
owner.clockMilliseconds = () => 0;
for (const [name, source] of [
    ["ForeignDate", "Date"],
    ["foreignGet", "Date.prototype.getHours"],
    ["foreignSet", "Date.prototype.setHours"],
    ["foreignParse", "Date.parse"],
    ["OwnerTypeError", "TypeError"],
]) {
    caller.defineScriptGlobal(name, { value: run(source, owner) });
}
const cross = run(
    'var d=new Date(0);var ok=false;try{foreignGet.call({})}catch(e){ok=e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok&&foreignGet.call(d)===19&&d.getHours()===9&&foreignParse("1970-01-01T00:00:00")===18000000&&Date.parse("1970-01-01T00:00:00")===-32400000&&new ForeignDate(1970,0,1).getTime()===18000000&&foreignSet.call(d,0)===-68400000&&ForeignDate()==="Wed Dec 31 1969 19:00:00 GMT-0500 (America/New_York)"',
    caller,
);
check(cross.kind === "boolean" && cross.value, "defining Realm timezone");
const baseline = new Realm((_line: string) => {}, "script");
check(baseline.dateTimeZone.identifier === "UTC", "UTC remains default");
const defaultValue = run(
    'new Date(0).toString()==="Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)"',
    baseline,
);
check(defaultValue.kind === "boolean" && defaultValue.value, "default display unchanged");
console.log("date named zone passed");
