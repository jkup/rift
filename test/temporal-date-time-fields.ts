import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import {
    readTemporalDateTimeFields,
    resolveTemporalDateTimeFields,
} from "../src/temporal-date-time-fields.js";
import { formatISODateTime } from "../src/temporal-time-format.js";
import { languageFailure, normal, type ValueCompletion } from "../src/runtime.js";

function passes(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    realm.registerBuiltin(
        realm.globalObject,
        "dateTimeFields",
        2,
        (_receiver, args, context, loc): ValueCompletion => {
            if (args.length === 0 || args[0].kind !== "object") {
                return languageFailure(context.realm, "TypeError", "object required", loc);
            }
            const fields = readTemporalDateTimeFields(args[0].object, context, loc);
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
            const date = resolveTemporalDateTimeFields(fields.value, reject, context, loc);
            return date.type === "throw"
                ? date
                : normal({
                      kind: "string",
                      value: formatISODateTime(date.value, "auto") ?? "invalid",
                  });
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
    'dateTimeFields({year:2024,month:2,day:29})==="2024-02-29T00:00:00"',
    'dateTimeFields({year:2024,month:2,day:29,hour:12,minute:34,second:56,millisecond:123,microsecond:456,nanosecond:789})==="2024-02-29T12:34:56.123456789"',
    'dateTimeFields({year:2023,month:2,day:29,hour:24,minute:60,second:60,millisecond:1000,microsecond:1000,nanosecond:1000})==="2023-02-28T23:59:59.999999999"',
    'dateTimeFields({year:2024,monthCode:"M02",day:29,hour:-9,minute:-9,second:-9,millisecond:-9,microsecond:-9,nanosecond:-9})==="2024-02-29T00:00:00"',
    'dateTimeFields({year:2024,month:1,day:1,hour:"12.9",nanosecond:"9.9"},{reject:true})==="2024-01-01T12:00:00.000000009"',
    'dateTimeFields({year:-271821,month:4,day:19,nanosecond:1},{reject:true})==="-271821-04-19T00:00:00.000000001"',
    'dateTimeFields({year:275760,month:9,day:13,hour:23,minute:59,second:59,millisecond:999,microsecond:999,nanosecond:999},{reject:true})==="+275760-09-13T23:59:59.999999999"',
    'var log="",o={};var names=["day","hour","microsecond","millisecond","minute","month","monthCode","nanosecond","second","year"];for(let i=0;i<names.length;i++)Object.defineProperty(o,names[i],{get(){log+=i+",";return undefined}});var ok=false;try{dateTimeFields(o,{get reject(){log+="options";return true}})}catch(e){ok=e instanceof TypeError}ok&&log==="0,1,2,3,4,5,6,7,8,9,options"',
    'var log="";dateTimeFields({day:{valueOf(){log+="d";return 1}},hour:{valueOf(){log+="h";return 1}},microsecond:{valueOf(){log+="u";return 1}},millisecond:{valueOf(){log+="l";return 1}},minute:{valueOf(){log+="i";return 1}},month:{valueOf(){log+="m";return 1}},monthCode:{toString(){log+="c";return "M01"}},nanosecond:{valueOf(){log+="n";return 1}},second:{valueOf(){log+="s";return 1}},year:{valueOf(){log+="y";return 2024}}});log==="dhulimcnsy"',
    "var ok=false;try{dateTimeFields({hour:99},{reject:true})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{dateTimeFields({},{get reject(){throw 42}})}catch(e){ok=e===42}ok",
    'var ok=false;try{dateTimeFields({year:2024,monthCode:"M13",day:1,hour:99},{get reject(){throw 42}})}catch(e){ok=e===42}ok',
    "var touched=false,ok=false;try{dateTimeFields({day:0,get hour(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    "var touched=false,ok=false;try{dateTimeFields({hour:Infinity,get microsecond(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    'var touched=false,ok=false;try{dateTimeFields({monthCode:"M00",get nanosecond(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'dateTimeFields({year:2024,month:1,day:1,get era(){throw 1},get timeZone(){throw 2}})==="2024-01-01T00:00:00"',
]) {
    passes(text);
}
for (const fields of ["{}", "{hour:1}", "{year:2024,day:1}", "{year:2024,month:1}"]) {
    passes("var ok=false;try{dateTimeFields(" + fields + ")}catch(e){ok=e instanceof TypeError}ok");
}
for (const field of [
    "hour:24",
    "minute:60",
    "second:60",
    "millisecond:1000",
    "microsecond:1000",
    "nanosecond:1000",
    "hour:-1",
]) {
    passes(
        "var ok=false;try{dateTimeFields({year:2024,month:1,day:1," +
            field +
            "},{reject:true})}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const field of [
    "year:-271821,month:4,day:19",
    "year:275760,month:9,day:14",
    'year:2024,month:13,monthCode:"M12",day:1',
]) {
    passes(
        "var ok=false;try{dateTimeFields({" + field + "})}catch(e){ok=e instanceof RangeError}ok",
    );
}
console.log("temporal date time fields passed");
