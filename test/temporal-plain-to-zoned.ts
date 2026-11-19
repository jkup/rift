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
    const prepared = prepareBoundedScript({ id: "temporal-plain-to-zoned", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'new Temporal.PlainDate(1970,1,1).toZonedDateTime("+05:30").epochNanoseconds===-19800000000000n',
    'new Temporal.PlainDate(1970,1,1).toZonedDateTime({timeZone:"+05:30",plainTime:"05:30"}).epochNanoseconds===0n',
    'new Temporal.PlainDateTime(1970,1,1,5,30,0,0,0,1).toZonedDateTime("+05:30").epochNanoseconds===1n',
    'new Temporal.PlainDateTime(1970,1,1).toZonedDateTime("2020-01-01[UTC]").epochNanoseconds===0n',
    'var z=new Temporal.ZonedDateTime(999n,"UTC");Object.defineProperty(z,"plainTime",{get(){throw 1}});new Temporal.PlainDate(1970,1,1).toZonedDateTime(z).epochNanoseconds===0n',
    'var t="",z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"timeZone",{get(){t+="Z";return "+01"}});Object.defineProperty(z,"plainTime",{get(){t+="T";return "01:00"}});new Temporal.PlainDate(1970,1,1).toZonedDateTime(z).epochNanoseconds===0n&&t==="ZT"',
    'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"timeZone",{get(){throw 1}});new Temporal.PlainDateTime(1970,1,1).toZonedDateTime(z).epochNanoseconds===0n',
    'var t="";try{new Temporal.PlainDate(1970,1,1).toZonedDateTime({get timeZone(){t+="Z";return "bad"},get plainTime(){t+="!"}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="ZR"',
    'var t="";try{new Temporal.PlainDateTime(1970,1,1).toZonedDateTime("bad",{get disambiguation(){t+="!"}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="R"',
    'var t="";new Temporal.PlainDateTime(1970,1,1).toZonedDateTime("UTC",{get disambiguation(){t+="D";return{toString(){t+="d";return "later"}}},get offset(){throw 1},get overflow(){throw 2}});t==="Dd"',
    'new Temporal.PlainDate(-271821,4,19).toZonedDateTime({timeZone:"-23:59",plainTime:"00:01"}).epochNanoseconds===-8640000000000000000000n',
    'new Temporal.PlainDateTime(-271821,4,19,0,1).toZonedDateTime("-23:59").epochNanoseconds===-8640000000000000000000n',
    'new Temporal.PlainDateTime(275760,9,13,23,59).toZonedDateTime("+23:59").epochNanoseconds===8640000000000000000000n',
    'new Temporal.PlainDate(1970,1,1).toZonedDateTime("UTC",{get plainTime(){throw 1}}).epochNanoseconds===0n',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const mode of ["compatible", "earlier", "later", "reject"]) {
    const result = run(
        'new Temporal.PlainDateTime(1970,1,1).toZonedDateTime("UTC",{disambiguation:"' +
            mode +
            '"}).epochNanoseconds===0n',
    );
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, mode);
}
for (const expression of [
    'new Temporal.PlainDate(-271821,4,19).toZonedDateTime("-23:59")',
    'new Temporal.PlainDateTime(275760,9,13,23,59,0,0,0,1).toZonedDateTime("+23:59")',
    'new Temporal.PlainDateTime(1970,1,1).toZonedDateTime("UTC",{disambiguation:"bad"})',
]) {
    const result = run(
        "var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok",
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        expression,
    );
}
for (const name of ["PlainDate", "PlainDateTime"]) {
    const receiver = "new Temporal." + name + "(1970,1,1)";
    for (const zone of ["undefined", "null", "{}", '{toString(){return "UTC"}}']) {
        const result = run(
            "var ok=false;try{" +
                receiver +
                ".toZonedDateTime(" +
                zone +
                ")}catch(e){ok=e instanceof TypeError}ok",
        );
        check(
            result.type === "normal" && result.value.kind === "boolean" && result.value.value,
            name + zone,
        );
    }
    const metadata = run(
        "var d=Object.getOwnPropertyDescriptor(Temporal." +
            name +
            '.prototype,"toZonedDateTime");d.writable&&!d.enumerable&&d.configurable&&d.value.length===1',
    );
    check(
        metadata.type === "normal" && metadata.value.kind === "boolean" && metadata.value.value,
        name + " metadata",
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const method = run("Temporal." + name + ".prototype.toZonedDateTime", defining),
        prototype = run("Temporal.ZonedDateTime.prototype", defining);
    if (method.type !== "normal" || prototype.type !== "normal") {
        throw new Error("lookup");
    }
    calling.defineScriptGlobal("project", { value: method.value });
    const value = run("project.call(" + receiver + ',"UTC")', calling);
    check(
        value.type === "normal" &&
            value.value.kind === "object" &&
            prototype.value.kind === "object" &&
            value.value.object.getPrototypeOf() === prototype.value.object,
        name + " Realm",
    );
}
console.log("temporal plain to zoned passed");
