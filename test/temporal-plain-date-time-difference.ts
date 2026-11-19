import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "date-time-core", text }, realm);
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
    'new Temporal.PlainDateTime(2024,1,1,12).until("2024-01-03T13:02:03.004005006").toString()==="P2DT1H2M3.004005006S"',
    'new Temporal.PlainDateTime(2024,1,1,12).since("2024-01-03T13:02:03.004005006").toString()==="-P2DT1H2M3.004005006S"',
    'new Temporal.PlainDateTime(2024,1,1,12).until("2024-01-03T13:00",{largestUnit:"hour"}).toString()==="PT49H"',
    'new Temporal.PlainDateTime(2024,1,1,23).until("2024-01-02T01:00").toString()==="PT2H"',
    'new Temporal.PlainDateTime(2020,2,29,12).until("2021-02-28T12:00",{largestUnit:"year"}).toString()==="P11M30D"',
    'new Temporal.PlainDateTime(2020,2,29,12).since("2021-02-28T12:00",{largestUnit:"year"}).toString()==="-P11M30D"',
    'new Temporal.PlainDateTime(2021,2,28,12).until("2020-02-29T12:00",{largestUnit:"year"}).toString()==="-P11M28D"',
    'new Temporal.PlainDateTime(2023,1,31,12).until("2023-02-28T12:00",{largestUnit:"month",smallestUnit:"day",roundingIncrement:10,roundingMode:"ceil"}).toString()==="P1M"',
    'new Temporal.PlainDateTime(2024,1,1,12).until("2024-02-01T11:59:59.9995",{largestUnit:"month",smallestUnit:"second",roundingMode:"halfExpand"}).toString()==="P1M"',
    'new Temporal.PlainDateTime(2024,1,1,12).until("2024-01-17T00:00:00.000000001",{smallestUnit:"month",roundingMode:"halfEven"}).toString()==="P1M"',
    'new Temporal.PlainDateTime(1969,12,31,23,59,59,999,999,999).until("1970-01-01").nanoseconds===1',
    "new Temporal.PlainDateTime(2024,1,1).until(new Temporal.PlainDate(2024,1,2)).days===1",
    "new Temporal.PlainDateTime(2024,1,1).until({year:2024,month:1,day:1,hour:99}).hours===23",
    'var d=new Temporal.PlainDateTime(2024,1,1);var r=d.since(d);r.toString()==="PT0S"&&Object.is(r.days,0)&&Object.is(r.nanoseconds,0)',
    'var d=new Temporal.PlainDateTime(2024,1,1),o=new Temporal.PlainDateTime(2024,1,2);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(o,"hour",{get(){throw 2}});d.until(o).days===1',
    'var log="";new Temporal.PlainDateTime(2024,1,1).until({get calendar(){log+="c"},year:2024,month:1,get day(){log+="d";return 2}},{get largestUnit(){log+="l"},get roundingIncrement(){log+="i"},get roundingMode(){log+="r"},get smallestUnit(){log+="s"}});log==="cdlirs"',
    "var touched=false,ok=false;try{Temporal.PlainDateTime.prototype.until.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var touched=false,ok=false;try{new Temporal.PlainDateTime(2024,1,1).until("bad",{get largestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    "var d=new Temporal.PlainDateTime(2024,1,1),ok=false;try{d.until(d,{get largestUnit(){throw 42}})}catch(e){ok=e===42}ok",
    'new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).until(new Temporal.PlainDateTime(275760,9,13,23,59,59,999,999,999)).toString()==="P200000001DT23H59M59.999999998S"',
    'new Temporal.PlainDateTime(-271821,5,19).until("-271821-04-19T00:00:00.000000001",{largestUnit:"month",smallestUnit:"month",roundingMode:"floor"}).toString()==="-P1M"',
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
        'new Temporal.PlainDateTime(2024,1,1).until("2024-01-01T01:30",{smallestUnit:"hour",roundingMode:"' +
            modes[i] +
            '"}).toString()==="PT' +
            forward[i] +
            'H"',
    );
    passes(
        'new Temporal.PlainDateTime(2024,1,1).since("2024-01-01T01:30",{smallestUnit:"hour",roundingMode:"' +
            modes[i] +
            '"}).toString()==="-PT' +
            backward[i] +
            'H"',
    );
}
for (const options of ["null", "1", '"day"']) {
    passes(
        'var ok=false;try{new Temporal.PlainDateTime(2024,1,1).until("2024-01-02",' +
            options +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const options of [
    '{smallestUnit:"auto"}',
    '{largestUnit:"hour",smallestUnit:"day"}',
    '{smallestUnit:"minute",roundingIncrement:7}',
]) {
    passes(
        'var ok=false;try{new Temporal.PlainDateTime(2024,1,1).until("2024-01-01",' +
            options +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const method of ["until", "since"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const fn = run("Temporal.PlainDateTime.prototype." + method, defining);
    if (fn.type !== "normal") {
        throw new Error("lookup");
    }
    calling.defineScriptGlobal("difference", { value: fn.value });
    const result = run(
        'difference.call(new Temporal.PlainDateTime(2024,1,1),"2024-01-02")',
        calling,
    );
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === defining.temporalDurationPrototype,
        "defining Realm result",
    );
    const failed = run('difference.call({}, "2024-01-02")', calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
console.log("temporal plain date time difference passed");
