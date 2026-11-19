import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    text: string,
    realm: Realm = new Realm((_line: string) => {}, "script"),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-conversion", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'Temporal.ZonedDateTime.from("1970-01-01T00Z[+05:30]").epochNanoseconds===0n',
    'Temporal.ZonedDateTime.from("1970-01-01[+05:30]").epochNanoseconds===-19800000000000n',
    'Temporal.ZonedDateTime.from("1970-01-01T00+01[+05:30]",{offset:"use"}).epochNanoseconds===-3600000000000n',
    'Temporal.ZonedDateTime.from("1970-01-01T00+01[+05:30]",{offset:"prefer"}).epochNanoseconds===-19800000000000n',
    'Temporal.ZonedDateTime.from("1970-01-01T00+01[+05:30]",{offset:"ignore"}).epochNanoseconds===-19800000000000n',
    'Temporal.ZonedDateTime.from({year:1970,monthCode:"M01",day:1,timeZone:"UTC"}).epochNanoseconds===0n',
    'Temporal.ZonedDateTime.from({year:2020,month:2,day:31,hour:99,timeZone:"UTC"}).toString()==="2020-02-29T23:00:00+00:00[UTC]"',
    'Temporal.ZonedDateTime.from({year:1970,month:1,day:1,timeZone:"UTC",offset:"+00:00:00.000000001"},{offset:"use"}).epochNanoseconds===-1n',
    'var z=new Temporal.ZonedDateTime(123n,"UTC");Object.defineProperty(z,"year",{get(){throw 1}});Object.defineProperty(z,"timeZone",{get(){throw 2}});z.toString=function(){throw 3};var x=Temporal.ZonedDateTime.from(z);x!==z&&x.epochNanoseconds===123n',
    'Temporal.ZonedDateTime.compare("1970-01-01T00Z[UTC]","1970-01-01T00Z[+01]")===0',
    'Temporal.ZonedDateTime.compare(new Temporal.ZonedDateTime(-1n,"UTC"),new Temporal.ZonedDateTime(0n,"UTC"))===-1',
    'new Temporal.ZonedDateTime(0n,"UTC").equals("1970-01-01T00Z[uTc]")',
    '!new Temporal.ZonedDateTime(0n,"UTC").equals("1970-01-01T00Z[+00]")',
    'new Temporal.ZonedDateTime(0n,"-00").equals("1970-01-01T00Z[+00]")',
    'Temporal.ZonedDateTime.from("-271821-04-19T00:01[-23:59]").epochNanoseconds===-8640000000000000000000n',
    'Temporal.ZonedDateTime.from({year:-271821,month:4,day:19,minute:1,timeZone:"-23:59"}).epochNanoseconds===-8640000000000000000000n',
    'Temporal.ZonedDateTime.from({year:275760,month:9,day:13,hour:23,minute:59,timeZone:"+23:59"}).epochNanoseconds===8640000000000000000000n',
    'var t="",o={get disambiguation(){t+="D";return{toString(){t+="d";return "earlier"}}},get offset(){t+="O";return{toString(){t+="o";return "use"}}},get overflow(){t+="F";return{toString(){t+="f";return "reject"}}}};Temporal.ZonedDateTime.from(new Temporal.ZonedDateTime(0n,"UTC"),o);t==="DdOoFf"',
    'var t="";try{Temporal.ZonedDateTime.from("bad",{get disambiguation(){t+="!"}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="R"',
    'var t="";try{Temporal.ZonedDateTime.from({year:1970,month:1,day:1,get offset(){t+="O";return 0},get timeZone(){t+="!";return "UTC"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="OT"',
    'var t="";try{Temporal.ZonedDateTime.from({get timeZone(){t+="Z"},get year(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="ZT"',
    'var t="";try{Temporal.ZonedDateTime.prototype.equals.call({}, {get calendar(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'var t="";try{Temporal.ZonedDateTime.compare("bad", {get calendar(){t+="!"}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="R"',
    'class Z extends Temporal.ZonedDateTime{};var z=Z.from("1970-01-01[UTC]");Object.getPrototypeOf(z)===Temporal.ZonedDateTime.prototype',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const order = run(
    'var t="",x={};for(var k of ["calendar","day","hour","microsecond","millisecond","minute","month","monthCode","nanosecond","offset","second","timeZone","year"]){(function(k){Object.defineProperty(x,k,{get(){t+=k+",";if(k==="calendar")return "iso8601";if(k==="timeZone")return "UTC";if(k==="year")return 1970;if(k==="month"||k==="day")return 1;return undefined}})})(k)}Temporal.ZonedDateTime.from(x,{get disambiguation(){t+="D"},get offset(){t+="O"},get overflow(){t+="F"}});t==="calendar,day,hour,microsecond,millisecond,minute,month,monthCode,nanosecond,offset,second,timeZone,year,DOF"',
);
check(
    order.type === "normal" && order.value.kind === "boolean" && order.value.value,
    "field order",
);
for (const options of ['{disambiguation:"bad"}', '{offset:"bad"}', '{overflow:"bad"}']) {
    const result = run(
        'var ok=false;try{Temporal.ZonedDateTime.from(new Temporal.ZonedDateTime(0n,"UTC"),' +
            options +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        options,
    );
}
for (const expression of [
    'Temporal.ZonedDateTime.from("1970-01-01T00+01[UTC]")',
    'Temporal.ZonedDateTime.from("2020-02-30[UTC]",{overflow:"constrain"})',
    'Temporal.ZonedDateTime.from({year:2020,month:2,day:31,timeZone:"UTC"},{overflow:"reject"})',
    'Temporal.ZonedDateTime.from("+275760-09-13T23:59:00.000000001[+23:59]")',
    'Temporal.ZonedDateTime.from({year:1970,month:1,day:1,timeZone:"UTC",offset:"Z"})',
]) {
    const result = run(
        "var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok",
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        expression,
    );
}
for (const input of ["null", "undefined", "1", "true", "1n", "Symbol()"]) {
    const result = run(
        "var ok=false;try{Temporal.ZonedDateTime.from(" +
            input +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, input);
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.ZonedDateTime.from", defining),
    prototype = run("Temporal.ZonedDateTime.prototype", defining);
if (method.type !== "normal" || prototype.type !== "normal") {
    throw new Error("lookup");
}
calling.defineScriptGlobal("convertZoned", { value: method.value });
const value = run('convertZoned(new Temporal.ZonedDateTime(0n,"UTC"))', calling);
check(
    value.type === "normal" &&
        value.value.kind === "object" &&
        prototype.value.kind === "object" &&
        value.value.object.getPrototypeOf() === prototype.value.object,
    "intrinsic Realm",
);
console.log("temporal zoned conversion passed");
