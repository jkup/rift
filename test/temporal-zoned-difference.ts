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
    const prepared = prepareBoundedScript({ id: "temporal-zoned-difference", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'Temporal.ZonedDateTime.from("2024-01-01T12[UTC]").until("2024-01-03T13:02:03.004005006[UTC]").toString()==="PT49H2M3.004005006S"',
    'Temporal.ZonedDateTime.from("2024-01-01T12[UTC]").since("2024-01-03T13[UTC]",{largestUnit:"days"}).toString()==="-P2DT1H"',
    'Temporal.ZonedDateTime.from("2020-01-31T12[+05:30]").until("2020-02-29T11:59:59.999999999[+05:30]",{largestUnit:"month",smallestUnit:"second",roundingMode:"halfExpand"}).toString()==="P1M"',
    'Temporal.ZonedDateTime.from("2020-01-31T12[UTC]").until("2020-03-01T12[UTC]",{largestUnit:"month",smallestUnit:"week",roundingMode:"halfExpand"}).toString()==="P1M"',
    'new Temporal.ZonedDateTime(0n,"UTC").until(new Temporal.ZonedDateTime(3600000000000n,"+05:30")).hours===1',
    'var z=new Temporal.ZonedDateTime(0n,"UTC");z.until(new Temporal.ZonedDateTime(0n,"+00:00")).toString()==="PT0S"',
    'var z=new Temporal.ZonedDateTime(0n,"UTC"),o=new Temporal.ZonedDateTime(3600000000000n,"UTC");Object.defineProperty(z,"timeZoneId",{get(){throw 1}});Object.defineProperty(o,"epochNanoseconds",{get(){throw 2}});z.until(o).hours===1',
    'var log="";new Temporal.ZonedDateTime(0n,"UTC").until({get calendar(){log+="c"},year:1970,month:1,get day(){log+="d";return 2},timeZone:"UTC"},{get largestUnit(){log+="l"},get roundingIncrement(){log+="i"},get roundingMode(){log+="r"},get smallestUnit(){log+="s"}});log==="cdlirs"',
    "var t=false,ok=false;try{Temporal.ZonedDateTime.prototype.until.call({}, {get calendar(){t=true}})}catch(e){ok=e instanceof TypeError}ok&&!t",
    'var t=false,ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").until("bad",{get largestUnit(){t=true}})}catch(e){ok=e instanceof RangeError}ok&&!t',
    'var z=new Temporal.ZonedDateTime(0n,"UTC"),ok=false;try{z.until(z,{get largestUnit(){throw 42}})}catch(e){ok=e===42}ok',
    'var z=new Temporal.ZonedDateTime(8640000000000000000000n,"UTC");z.until(z,{smallestUnit:"year"}).toString()==="PT0S"',
    'new Temporal.ZonedDateTime(8639999913600000000000n,"UTC").until(new Temporal.ZonedDateTime(8640000000000000000000n,"UTC"),{largestUnit:"day"}).days===1',
    'var z=new Temporal.ZonedDateTime(0n,"UTC"),d=z.since(z);Object.is(d.days,0)&&Object.is(d.nanoseconds,0)',
    'Temporal.ZonedDateTime.prototype.until.length===1&&Temporal.ZonedDateTime.prototype.since.name==="since"',
]) {
    passes(text);
}
const modes = [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
];
const forward = [2, 1, 2, 1, 2, 1, 2, 1, 2],
    backward = [1, 2, 2, 1, 1, 2, 2, 1, 2];
for (let i = 0; i < modes.length; i++) {
    passes(
        'new Temporal.ZonedDateTime(0n,"UTC").until(new Temporal.ZonedDateTime(5400000000000n,"UTC"),{smallestUnit:"hour",roundingMode:"' +
            modes[i] +
            '"}).hours===' +
            forward[i],
    );
    passes(
        'new Temporal.ZonedDateTime(0n,"UTC").since(new Temporal.ZonedDateTime(5400000000000n,"UTC"),{smallestUnit:"hour",roundingMode:"' +
            modes[i] +
            '"}).hours===-' +
            backward[i],
    );
}
for (const expression of [
    'new Temporal.ZonedDateTime(0n,"UTC").until(new Temporal.ZonedDateTime(0n,"+00:00"),{largestUnit:"day"})',
    'new Temporal.ZonedDateTime(8639999913600000000000n,"UTC").until(new Temporal.ZonedDateTime(8640000000000000000000n,"UTC"),{largestUnit:"day",smallestUnit:"nanosecond",roundingIncrement:2})',
    'new Temporal.ZonedDateTime(0n,"UTC").until(new Temporal.ZonedDateTime(0n,"UTC"),{smallestUnit:"hour",roundingIncrement:24})',
    'new Temporal.ZonedDateTime(0n,"UTC").until(new Temporal.ZonedDateTime(0n,"UTC"),{largestUnit:"second",smallestUnit:"day"})',
]) {
    passes("var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok");
}
for (const options of ["null", "1", '"day"']) {
    passes(
        'var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").until(new Temporal.ZonedDateTime(0n,"UTC"),' +
            options +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.ZonedDateTime.prototype.until", defining),
    prototype = run("Temporal.Duration.prototype", defining);
if (method.type !== "normal" || prototype.type !== "normal") {
    throw new Error("lookup");
}
calling.defineScriptGlobal("zonedUntil", { value: method.value });
const value = run(
    'zonedUntil.call(new Temporal.ZonedDateTime(0n,"UTC"),new Temporal.ZonedDateTime(1n,"UTC"))',
    calling,
);
check(
    value.type === "normal" &&
        value.value.kind === "object" &&
        prototype.value.kind === "object" &&
        value.value.object.getPrototypeOf() === prototype.value.object,
    "intrinsic Realm",
);
console.log("temporal zoned difference passed");
