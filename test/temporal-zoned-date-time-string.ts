import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-date-time-string", text }, realm);
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
    'new Temporal.ZonedDateTime(0n,"UTC").toString()==="1970-01-01T00:00:00+00:00[UTC]"',
    'new Temporal.ZonedDateTime(-1n,"+02").toString()==="1970-01-01T01:59:59.999999999+02:00[+02:00]"',
    'new Temporal.ZonedDateTime(0n,"-00").toString()==="1970-01-01T00:00:00+00:00[+00:00]"',
    'new Temporal.ZonedDateTime(0n,"UTC").toString({timeZoneName:"critical",calendarName:"critical"})==="1970-01-01T00:00:00+00:00[!UTC][!u-ca=iso8601]"',
    'new Temporal.ZonedDateTime(0n,"UTC").toString({timeZoneName:"never",offset:"never",calendarName:"always"})==="1970-01-01T00:00:00[u-ca=iso8601]"',
    'new Temporal.ZonedDateTime(0n,"UTC").toString({timeZoneName:"never"})==="1970-01-01T00:00:00+00:00"',
    'new Temporal.ZonedDateTime(0n,"UTC").toString({offset:"never"})==="1970-01-01T00:00:00[UTC]"',
    'new Temporal.ZonedDateTime(123456789n,"UTC").toString({fractionalSecondDigits:4})==="1970-01-01T00:00:00.1234+00:00[UTC]"',
    'new Temporal.ZonedDateTime(123456789n,"UTC").toString({smallestUnit:"milliseconds",fractionalSecondDigits:9})==="1970-01-01T00:00:00.123+00:00[UTC]"',
    'new Temporal.ZonedDateTime(-1n,"UTC").toString({smallestUnit:"minute"})==="1969-12-31T23:59+00:00[UTC]"',
    'new Temporal.ZonedDateTime(-1n,"UTC").toString({smallestUnit:"second",roundingMode:"ceil"})==="1970-01-01T00:00:00+00:00[UTC]"',
    'new Temporal.ZonedDateTime(86399999999999n,"UTC").toString({smallestUnit:"minute",roundingMode:"ceil"})==="1970-01-02T00:00+00:00[UTC]"',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"+23:59").toString()==="+275760-09-13T23:59:00+23:59[+23:59]"',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").toString()==="-271821-04-19T00:01:00-23:59[-23:59]"',
    'JSON.stringify(new Temporal.ZonedDateTime(0n,"UTC"))===\'"1970-01-01T00:00:00+00:00[UTC]"\'',
    'var log="",o={};for(var k of ["calendarName","fractionalSecondDigits","offset","roundingMode","smallestUnit","timeZoneName"]){Object.defineProperty(o,k,{get:(function(key){return function(){log+=key+",";return undefined}})(k)})}new Temporal.ZonedDateTime(0n,"UTC").toString(o);log==="calendarName,fractionalSecondDigits,offset,roundingMode,smallestUnit,timeZoneName,"',
    'var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").toString({smallestUnit:"hour",get timeZoneName(){throw 7}})}catch(e){ok=e===7}ok',
    'var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").toString({offset:"bad",get roundingMode(){throw 7}})}catch(e){ok=e instanceof RangeError}ok',
]) {
    passes(text);
}
for (const name of ["toString", "toJSON", "toLocaleString"]) {
    passes(
        "Temporal.ZonedDateTime.prototype." +
            name +
            ".length===0&&Temporal.ZonedDateTime.prototype." +
            name +
            '.name==="' +
            name +
            '"',
    );
    passes(
        "var ok=false;try{Temporal.ZonedDateTime.prototype." +
            name +
            ".call({}, {get calendarName(){throw 7}})}catch(e){ok=e instanceof TypeError}ok",
    );
    if (name !== "toString") {
        passes(
            'new Temporal.ZonedDateTime(0n,"UTC").' +
                name +
                '({get calendarName(){throw 7}})==="1970-01-01T00:00:00+00:00[UTC]"',
        );
    }
}
for (const option of ["null", "1", '"second"']) {
    passes(
        'var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").toString(' +
            option +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const option of [
    '{offset:"always"}',
    '{timeZoneName:"always"}',
    '{smallestUnit:"hour"}',
    '{smallestUnit:"day"}',
    "{fractionalSecondDigits:10}",
    '{roundingMode:"bad"}',
]) {
    passes(
        'var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").toString(' +
            option +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
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
    ],
    rounded = ["00", "59", "00", "59", "00", "59", "00", "59", "00"];
for (let i = 0; i < modes.length; i++) {
    passes(
        'new Temporal.ZonedDateTime(-500000000n,"UTC").toString({smallestUnit:"second",roundingMode:"' +
            modes[i] +
            '"}).slice(17,19)==="' +
            rounded[i] +
            '"',
    );
}
const owner = new Realm((_line: string) => {}, "script"),
    other = new Realm((_line: string) => {}, "script");
other.defineScriptGlobal("format", {
    value: run("Temporal.ZonedDateTime.prototype.toString", owner),
});
other.defineScriptGlobal("OwnerRangeError", { value: run("RangeError", owner) });
const cross = run(
    'var ok=false;try{format.call(new Temporal.ZonedDateTime(0n,"UTC"),{offset:"bad"})}catch(e){ok=e instanceof OwnerRangeError&&!(e instanceof RangeError)}ok',
    other,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Zoned string Realm");
}
console.log("temporal zoned date time string passed");
