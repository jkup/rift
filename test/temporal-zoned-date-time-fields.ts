import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-date-time-fields", text }, realm);
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
const names = [
    "era",
    "eraYear",
    "year",
    "month",
    "monthCode",
    "day",
    "dayOfWeek",
    "dayOfYear",
    "weekOfYear",
    "yearOfWeek",
    "daysInWeek",
    "daysInMonth",
    "daysInYear",
    "monthsInYear",
    "inLeapYear",
    "hour",
    "minute",
    "second",
    "millisecond",
    "microsecond",
    "nanosecond",
    "offset",
    "offsetNanoseconds",
    "hoursInDay",
];
const expected = [
    "undefined",
    "undefined",
    "2020",
    "2",
    '"M02"',
    "29",
    "6",
    "60",
    "9",
    "2020",
    "7",
    "29",
    "366",
    "12",
    "true",
    "18",
    "4",
    "56",
    "789",
    "123",
    "456",
    '"+05:30"',
    "19800000000000",
    "24",
];
for (let index = 0; index < names.length; index++) {
    const name = names[index];
    passes(
        'new Temporal.ZonedDateTime(1582979696789123456n,"+05:30").' +
            name +
            "===" +
            expected[index],
    );
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"' +
            name +
            '");d.get.name==="get ' +
            name +
            '"&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable',
    );
    for (const receiver of [
        "{}",
        "Temporal.ZonedDateTime.prototype",
        "new Temporal.PlainDate(2020,1,1)",
    ]) {
        passes(
            'var ok=false;try{Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"' +
                name +
                '").get.call(' +
                receiver +
                ")}catch(e){ok=e instanceof TypeError}ok",
        );
    }
}
for (const text of [
    'var z=new Temporal.ZonedDateTime(0n,"-01");z.year===1969&&z.month===12&&z.day===31&&z.hour===23&&z.yearOfWeek===1970&&z.weekOfYear===1',
    'var z=new Temporal.ZonedDateTime(-1n,"UTC");z.second===59&&z.millisecond===999&&z.microsecond===999&&z.nanosecond===999&&z.offset==="+00:00"',
    'var z=new Temporal.ZonedDateTime(0n,"-00");1/z.offsetNanoseconds===Infinity&&z.offset==="+00:00"',
    'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"timeZoneId",{get:function(){throw 7}});Object.defineProperty(z,"calendarId",{get:function(){throw 8}});z.year===1970&&z.offset==="+00:00"&&z.hoursInDay===24',
    'var z=new Temporal.ZonedDateTime(8640000000000000000000n,"+23:59");z.year===275760&&z.month===9&&z.day===13&&z.hour===23&&z.minute===59',
    'var z=new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59");z.year===-271821&&z.month===4&&z.day===19&&z.hour===0&&z.minute===1',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"UTC").hoursInDay===24',
    'new Temporal.ZonedDateTime(8639999913600000000000n,"UTC").hoursInDay===24',
]) {
    passes(text);
}
for (const epoch of ["8640000000000000000000n", "-8640000000000000000000n"]) {
    for (const zone of ["UTC", "-23:59", "+23:59"]) {
        if (epoch.charAt(0) === "-" && zone === "UTC") {
            continue;
        }
        passes(
            "var ok=false;try{new Temporal.ZonedDateTime(" +
                epoch +
                ',"' +
                zone +
                '").hoursInDay}catch(e){ok=e instanceof RangeError}ok',
        );
    }
}
const owner = new Realm((_line: string) => {}, "script"),
    other = new Realm((_line: string) => {}, "script");
other.defineScriptGlobal("getter", {
    value: run(
        'Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"hoursInDay").get',
        owner,
    ),
});
other.defineScriptGlobal("OwnerRangeError", { value: run("RangeError", owner) });
const cross = run(
    'var ok=false;try{getter.call(new Temporal.ZonedDateTime(8640000000000000000000n,"UTC"))}catch(e){ok=e instanceof OwnerRangeError&&!(e instanceof RangeError)}ok',
    other,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Zoned fields Realm");
}
console.log("temporal zoned date time fields passed");
