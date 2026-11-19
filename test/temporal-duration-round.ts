import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "duration-round", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("completion: " + text);
    }
    return result.value;
}
function passes(text: string): void {
    const value = run(text);
    if (value.kind !== "boolean" || !value.value) {
        throw new Error(text);
    }
}
for (const text of [
    'Temporal.Duration.from("PT1H30M").round("hour").toString()==="PT2H"',
    'Temporal.Duration.from("-PT1H30M").round("hour").toString()==="-PT2H"',
    'Temporal.Duration.from("PT25H").round({largestUnit:"day"}).toString()==="P1DT1H"',
    'Temporal.Duration.from("PT25H").round({largestUnit:"auto"}).toString()==="PT25H"',
    'Temporal.Duration.from("P1DT12H").round("day").toString()==="P2D"',
    'Temporal.Duration.from("PT0.000000015S").round({smallestUnit:"nanosecond",roundingIncrement:10,roundingMode:"halfEven"}).nanoseconds===20',
    'Temporal.Duration.from("PT0.000000025S").round({smallestUnit:"nanosecond",roundingIncrement:10,roundingMode:"halfEven"}).nanoseconds===20',
    'Temporal.Duration.from("P14DT12H").round({smallestUnit:"month",relativeTo:"2020-01-31"}).toString()==="P1M"',
    'Temporal.Duration.from("P14DT12H").round({smallestUnit:"month",roundingMode:"halfEven",relativeTo:"2020-01-31"}).blank',
    'Temporal.Duration.from("-P15DT12H").round({smallestUnit:"month",relativeTo:"2020-03-31"}).toString()==="-P1M"',
    'Temporal.Duration.from("P11M30DT23H").round({largestUnit:"year",smallestUnit:"day",relativeTo:"2020-01-01"}).toString()==="P1Y"',
    'Temporal.Duration.from("P10DT12H").round({smallestUnit:"week",relativeTo:"2020-01-01"}).toString()==="P2W"',
    'Temporal.Duration.from("PT1H").round({smallestUnit:"hour",relativeTo:"+275760-09-13"}).hours===1',
    'new Temporal.Duration().round({smallestUnit:"year",relativeTo:"-271821-04-19"}).blank',
    'Temporal.Duration.from("P1M").round({largestUnit:"day",relativeTo:"2020-01-31"}).days===29',
    "var touched=false,ok=false;try{Temporal.Duration.prototype.round.call({}, {get largestUnit(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var log="";var d=Temporal.Duration.from("PT1H30M");d.round({get largestUnit(){log+="l";return "day"},get relativeTo(){log+="r"},get roundingIncrement(){log+="i";return 1},get roundingMode(){log+="m";return "ceil"},get smallestUnit(){log+="s";return "hour"}}).hours===2&&log==="lrims"',
    'var d=Temporal.Duration.from("PT1H");Object.defineProperty(d,"hours",{get(){throw 1}});d.round("hour").hours===1',
    'var d=Temporal.Duration.from("PT1H");d.round("hour")!==d',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"round");d.writable&&!d.enumerable&&d.configurable&&d.value.name==="round"&&d.value.length===1',
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
const positive = [2, 1, 2, 1, 2, 1, 2, 1, 2],
    negative = [-1, -2, -2, -1, -1, -2, -2, -1, -2];
for (let i = 0; i < modes.length; i++) {
    passes(
        'Temporal.Duration.from("PT1H30M").round({smallestUnit:"hour",roundingMode:"' +
            modes[i] +
            '"}).hours===' +
            positive[i],
    );
    passes(
        'Temporal.Duration.from("-PT1H30M").round({smallestUnit:"hour",roundingMode:"' +
            modes[i] +
            '"}).hours===' +
            negative[i],
    );
}
for (const expression of [
    'Temporal.Duration.from("P1Y").round("day")',
    'new Temporal.Duration().round("year")',
    'Temporal.Duration.from("PT1H").round({})',
    'Temporal.Duration.from("P1D").round({smallestUnit:"day",relativeTo:"+275760-09-13"})',
    'Temporal.Duration.from("PT0.000000001S").round({smallestUnit:"nanosecond",relativeTo:"-271821-04-19"})',
    'Temporal.Duration.from("PT9007199254740991.999999999S").round("second")',
    'Temporal.Duration.from("-PT9007199254740991.999999999S").round("second")',
    'new Temporal.Duration().round({smallestUnit:"hour",relativeTo:"2020-01-01[Invalid/Zone]"})',
]) {
    passes("var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok");
}
for (const options of ["undefined", "null", "1", "true"]) {
    passes(
        "var ok=false;try{new Temporal.Duration().round(" +
            options +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("round", { value: run("Temporal.Duration.prototype.round", owner) });
caller.defineScriptGlobal("OwnerDuration", { value: run("Temporal.Duration", owner) });
caller.defineScriptGlobal("OwnerRangeError", { value: run("RangeError", owner) });
const cross = run(
    'var d=round.call(new Temporal.Duration(0,0,0,0,1,30),"hour");var ok=d instanceof OwnerDuration&&!(d instanceof Temporal.Duration)&&d.hours===2;try{round.call(new Temporal.Duration(1),"day")}catch(e){ok=ok&&e instanceof OwnerRangeError&&!(e instanceof RangeError)}ok',
    caller,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("round result/error Realm");
}
console.log("temporal duration round passed");
