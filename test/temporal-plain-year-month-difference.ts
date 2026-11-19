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
    const prepared = prepareBoundedScript({ id: "plain-date-core", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
passes('new Temporal.PlainYearMonth(2023,1).until("2024-03").toString()==="P1Y2M"');
passes(
    'new Temporal.PlainYearMonth(2023,1).until("2024-03",{largestUnit:"months"}).toString()==="P14M"',
);
passes('new Temporal.PlainYearMonth(2023,1).since("2024-03").toString()==="-P1Y2M"');
passes('new Temporal.PlainYearMonth(2024,3).until("2023-01").toString()==="-P1Y2M"');
passes(
    'new Temporal.PlainYearMonth(2024,2,undefined,29).until(new Temporal.PlainYearMonth(2024,2,undefined,1)).toString()==="PT0S"',
);
passes(
    'new Temporal.PlainYearMonth(2024,1).until("2024-07",{smallestUnit:"year",roundingMode:"halfExpand"}).toString()==="PT0S"',
);
passes(
    'new Temporal.PlainYearMonth(2023,7).until("2024-01",{smallestUnit:"year",roundingMode:"halfExpand"}).toString()==="P1Y"',
);
passes(
    'new Temporal.PlainYearMonth(2023,1).until("2024-12",{roundingIncrement:2,roundingMode:"ceil"}).toString()==="P2Y"',
);
passes('new Temporal.PlainYearMonth(275760,8).until("+275760-09").toString()==="P1M"');
passes('new Temporal.PlainYearMonth(-271821,4).until("-271821-04").toString()==="PT0S"');
passes('var d=new Temporal.PlainYearMonth(-271821,4,undefined,30);d.until(d).toString()==="PT0S"');
passes(
    'var d=new Temporal.PlainYearMonth(2024,2);Object.defineProperty(d,"year",{get(){throw 1}});d.until(new Temporal.PlainYearMonth(2025,2)).years===1',
);
passes(
    'var log="";new Temporal.PlainYearMonth(2024,1).until({get calendar(){log+="c"},get month(){log+="m";return 2},get monthCode(){log+="k"},get year(){log+="y";return 2024}},{get largestUnit(){log+="l";return "year"},get roundingIncrement(){log+="i";return 1},get roundingMode(){log+="r";return "trunc"},get smallestUnit(){log+="s";return "month"}});log==="cmkylirs"',
);
passes(
    'var touched=false,ok=false;try{new Temporal.PlainYearMonth(2024,1).until("bad",{get largestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
);
passes(
    'var proto=Temporal.Duration.prototype;Temporal.Duration=function(){throw 1};Object.getPrototypeOf(new Temporal.PlainYearMonth(2024,1).until("2025-01"))===proto',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"ceil"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"ceil"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"ceil"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"ceil"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"floor"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"floor"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"floor"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"floor"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"expand"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"expand"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"expand"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"expand"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"trunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"trunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"trunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"trunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfCeil"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfCeil"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfCeil"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfCeil"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfFloor"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfFloor"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfFloor"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfFloor"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfExpand"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfExpand"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfExpand"}).months===-2',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfExpand"}).months===2',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfTrunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfTrunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfTrunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfTrunc"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfEven"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,7).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfEven"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).until("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfEven"}).months===0',
);
passes(
    'new Temporal.PlainYearMonth(2024,9).since("2024-08",{largestUnit:"month",roundingIncrement:2,roundingMode:"halfEven"}).months===0',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,1).until("2024-01",{largestUnit:"day"})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,1).until("2024-01",{smallestUnit:"week"})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,1).until("2024-01",{largestUnit:"hour"})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,1).until("2024-01",{largestUnit:"month",smallestUnit:"year"})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,1).until("2024-01",{roundingIncrement:0})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,1).until("2024-01",{roundingIncrement:1000000001})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,1).until("2024-01",{roundingMode:"bad"})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(-271821,4).until("-271821-05")}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(-271821,5).until("-271821-04")}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(-271821,4,undefined,30).until("-271821-04")}catch(e){ok=e instanceof RangeError}ok',
);
for (const method of ["until", "since"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainYearMonth.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
    );
    passes(
        "var touched=false,ok=false;try{Temporal.PlainYearMonth.prototype." +
            method +
            ".call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const fn = run("Temporal.PlainYearMonth.prototype." + method, defining);
    if (fn.type !== "normal") {
        throw new Error("lookup");
    }
    calling.defineScriptGlobal("difference", { value: fn.value });
    const result = run('difference.call(new Temporal.PlainYearMonth(2024,2),"2025-03")', calling);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === defining.temporalDurationPrototype,
        "defining Realm result",
    );
    const failed = run("difference.call({})", calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
console.log("temporal plain year month difference passed");
