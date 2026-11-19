import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { dateDifferenceSettings } from "../src/temporal-date-difference-options.js";
import { normal, UNDEFINED, type ValueCompletion } from "../src/runtime.js";

function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    realm.registerBuiltin(
        realm.globalObject,
        "dateOptions",
        1,
        (_receiver, args, context, loc): ValueCompletion => {
            const result = dateDifferenceSettings(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            if (result.type === "throw") {
                return result;
            }
            const value = result.value;
            return normal({
                kind: "string",
                value:
                    value.largest + ":" + value.smallest + ":" + value.increment + ":" + value.mode,
            });
        },
    );
    const prepared = prepareBoundedScript({ id: "date-difference-options", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error(text);
    }
}
for (const text of [
    'dateOptions()==="day:day:1:trunc"',
    'dateOptions({largestUnit:"years"})==="year:day:1:trunc"',
    'dateOptions({smallestUnit:"months"})==="month:month:1:trunc"',
    'dateOptions({largestUnit:"auto",smallestUnit:"weeks",roundingIncrement:7.9})==="week:week:7:trunc"',
    'dateOptions({largestUnit:"year",smallestUnit:"month",roundingIncrement:25,roundingMode:"halfEven"})==="year:month:25:halfEven"',
    'dateOptions({smallestUnit:"year",roundingIncrement:1000000000})==="year:year:1000000000:trunc"',
    'var log="";var result=dateOptions({get largestUnit(){log+="l";return {toString(){log+="L";return "year"}}},get roundingIncrement(){log+="i";return {valueOf(){log+="I";return 3}}},get roundingMode(){log+="r";return {toString(){log+="R";return "ceil"}}},get smallestUnit(){log+="s";return {toString(){log+="S";return "month"}}}});result==="year:month:3:ceil"&&log==="lLiIrRsS"',
    'var ok=false;try{dateOptions({largestUnit:"hour",get smallestUnit(){throw 42}})}catch(e){ok=e===42}ok',
    'var touched=false,ok=false;try{dateOptions({largestUnit:"bad",get roundingIncrement(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false,ok=false;try{dateOptions({roundingMode:"bad",get smallestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'dateOptions({get relativeTo(){throw 1},get overflow(){throw 2}})==="day:day:1:trunc"',
]) {
    passes(text);
}
const units = ["year", "month", "week", "day"];
for (let large = 0; large < units.length; large++) {
    for (let small = 0; small < units.length; small++) {
        const options = '{largestUnit:"' + units[large] + '",smallestUnit:"' + units[small] + '"}';
        if (large <= small) {
            passes(
                "dateOptions(" +
                    options +
                    ')==="' +
                    units[large] +
                    ":" +
                    units[small] +
                    ':1:trunc"',
            );
        } else {
            passes(
                "var ok=false;try{dateOptions(" +
                    options +
                    ")}catch(e){ok=e instanceof RangeError}ok",
            );
        }
    }
}
for (const unit of units) {
    passes('dateOptions({smallestUnit:"' + unit + '"})==="' + unit + ":" + unit + ':1:trunc"');
}
for (const mode of [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
]) {
    passes('dateOptions({roundingMode:"' + mode + '"})==="day:day:1:' + mode + '"');
}
for (const options of ["null", "1", '"day"', "true"]) {
    passes("var ok=false;try{dateOptions(" + options + ")}catch(e){ok=e instanceof TypeError}ok");
}
for (const options of [
    '{largestUnit:"hour"}',
    '{smallestUnit:"hour"}',
    '{smallestUnit:"auto"}',
    "{roundingIncrement:0}",
    "{roundingIncrement:NaN}",
    "{roundingIncrement:Infinity}",
    "{roundingIncrement:1000000001}",
]) {
    passes("var ok=false;try{dateOptions(" + options + ")}catch(e){ok=e instanceof RangeError}ok");
}
console.log("temporal date difference options passed");
