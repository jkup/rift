import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { readTemporalDateFields, resolveTemporalDateFields } from "../src/temporal-date-fields.js";
import { formatISODate } from "../src/temporal-time-format.js";
import { languageFailure, normal, type ValueCompletion } from "../src/runtime.js";

function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    realm.registerBuiltin(
        realm.globalObject,
        "dateFields",
        2,
        (_receiver, args, context, loc): ValueCompletion => {
            if (args.length === 0 || args[0].kind !== "object") {
                return languageFailure(context.realm, "TypeError", "object required", loc);
            }
            const fields = readTemporalDateFields(args[0].object, context, loc);
            if (fields.type === "throw") {
                return fields;
            }
            let reject = false;
            if (args.length > 1 && args[1].kind === "object") {
                const read = args[1].object.internalGet("reject", args[1], context, loc);
                if (read.type === "throw") {
                    return read;
                }
                reject = read.value.kind === "boolean" && read.value.value;
            }
            const date = resolveTemporalDateFields(fields.value, reject, context, loc);
            return date.type === "throw"
                ? date
                : normal({ kind: "string", value: formatISODate(date.value) });
        },
    );
    const prepared = prepareBoundedScript({ id: "date-fields", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error(text);
    }
}

for (const text of [
    'dateFields({year:2024,month:2,day:29})==="2024-02-29"',
    'dateFields({year:2023,monthCode:"M02",day:29})==="2023-02-28"',
    'dateFields({year:2023,month:99,day:99})==="2023-12-31"',
    'dateFields({year:-0,month:2.9,day:29.9})==="0000-02-29"',
    'dateFields({year:-271821,month:4,day:19},{reject:true})==="-271821-04-19"',
    'dateFields({year:275760,month:9,day:13},{reject:true})==="+275760-09-13"',
    'dateFields({year:"2000",month:"2",monthCode:{toString(){return "M02"}},day:"29"})==="2000-02-29"',
    'var log="";var result=dateFields({get day(){log+="d";return {valueOf(){log+="D";return 1}}},get month(){log+="m";return {valueOf(){log+="M";return 2}}},get monthCode(){log+="c";return {[Symbol.toPrimitive](hint){log+=hint;return "M02"}}},get year(){log+="y";return {valueOf(){log+="Y";return 2024}}}},{get reject(){log+="o";return true}});result==="2024-02-01"&&log==="dDmMcstringyYo"',
    'var ok=false;try{dateFields({year:2024,monthCode:"M13",day:1},{get reject(){throw 42}})}catch(e){ok=e===42}ok',
    'var ok=false;try{dateFields({year:2024,monthCode:"M00L",day:1},{get reject(){throw 42}})}catch(e){ok=e===42}ok',
    "var ok=false;try{dateFields({},{get reject(){throw 42}})}catch(e){ok=e===42}ok",
    'var touched=false,ok=false;try{dateFields({monthCode:"M00",get year(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    "var touched=false,ok=false;try{dateFields({day:0,get month(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    "var touched=false,ok=false;try{dateFields({monthCode:2,get year(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'dateFields({year:2024,month:1,day:1,get era(){throw 1},get eraYear(){throw 2}})==="2024-01-01"',
]) {
    passes(text);
}
for (let month = 1; month <= 12; month++) {
    passes(
        "dateFields({year:2024,month:" +
            month +
            ',monthCode:"M' +
            String(month).padStart(2, "0") +
            '",day:1},{reject:true})==="2024-' +
            String(month).padStart(2, "0") +
            '-01"',
    );
}
for (const fields of [
    "{}",
    "{month:1,day:1}",
    "{year:2024,month:1}",
    "{year:2024,day:1}",
    "{year:2024,month:undefined,day:1}",
]) {
    passes("var ok=false;try{dateFields(" + fields + ")}catch(e){ok=e instanceof TypeError}ok");
}
for (const fields of [
    "{year:2024,month:0,day:1}",
    "{year:2024,month:1,day:0.9}",
    "{year:Infinity,month:1,day:1}",
    "{year:NaN,month:1,day:1}",
    "{year:-271821,month:4,day:18}",
    "{year:275760,month:9,day:14}",
    '{year:2024,month:13,monthCode:"M12",day:1}',
]) {
    passes("var ok=false;try{dateFields(" + fields + ")}catch(e){ok=e instanceof RangeError}ok");
}
for (const code of [
    "M00",
    "m01",
    "M1",
    "M001",
    "M01l",
    "M01Lx",
    "M-1",
    "M 1",
    "M01\n",
    "M13",
    "M99",
    "M00L",
    "M01L",
]) {
    passes(
        "var ok=false;try{dateFields({year:2024,monthCode:" +
            JSON.stringify(code) +
            ",day:1})}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const code of ["null", "true", "1", "1n", "Symbol()", "{[Symbol.toPrimitive](){return 1}}"]) {
    passes(
        "var ok=false;try{dateFields({year:2024,monthCode:" +
            code +
            ",day:1})}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const fields of [
    "{year:2023,month:2,day:29}",
    "{year:2024,month:13,day:1}",
    "{year:2024,month:4,day:31}",
]) {
    passes(
        "var ok=false;try{dateFields(" +
            fields +
            ",{reject:true})}catch(e){ok=e instanceof RangeError}ok",
    );
}
console.log("temporal date fields passed");
