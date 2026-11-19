import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { timeDifferenceSettings } from "../src/temporal-difference-options.js";
import { normal, UNDEFINED, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string): ValueCompletion {
    const realm = new Realm((_line: string) => {}, "script");
    for (const fallback of ["hour", "second"] as const) {
        realm.registerBuiltin(realm.globalObject, fallback, 1, (_receiver, args, context, loc): ValueCompletion => {
            const settings = timeDifferenceSettings(args.length === 0 ? UNDEFINED : args[0], fallback, context, loc);
            if (settings.type === "throw") return settings;
            return normal({ kind: "string", value: settings.value.largest+":"+settings.value.quantum.toString()+":"+settings.value.mode });
        });
    }
    const prepared = prepareBoundedScript({ id: "difference-options", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'hour()==="hours:1:trunc"&&second()==="seconds:1:trunc"',
    'second({smallestUnit:"minute"})==="minutes:60000000000:trunc"',
    'second({largestUnit:"auto",smallestUnit:"hours",roundingIncrement:12})==="hours:43200000000000:trunc"',
    'hour({largestUnit:"milliseconds",smallestUnit:"microseconds",roundingIncrement:250})==="milliseconds:250000:trunc"',
    'hour({smallestUnit:"second",roundingIncrement:2.9,roundingMode:"ceil"})==="hours:2000000000:ceil"',
    'var log="";var r=second({get largestUnit(){log+="l";return {toString(){log+="L";return "hour"}}},get roundingIncrement(){log+="i";return {valueOf(){log+="I";return 2}}},get roundingMode(){log+="r";return {toString(){log+="R";return "ceil"}}},get smallestUnit(){log+="s";return {toString(){log+="S";return "minute"}}}});r==="hours:120000000000:ceil"&&log==="lLiIrRsS"',
    'var ok=false;try{second({largestUnit:"day",get smallestUnit(){throw 42}})}catch(e){ok=e===42}ok',
    'var touched=false,ok=false;try{second({largestUnit:"bad",get roundingIncrement(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false,ok=false;try{second({roundingMode:"bad",get smallestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'hour({get relativeTo(){throw 1},get fractionalSecondDigits(){throw 2}})==="hours:1:trunc"',
]) passes(text);
const units=['hour','minute','second','millisecond','microsecond','nanosecond'];
const lengths=['3600000000000','60000000000','1000000000','1000000','1000','1'];
for (let i=0;i<units.length;i++) {
    passes('second({largestUnit:"'+units[i]+'",smallestUnit:"'+units[i]+'"})==="'+units[i]+'s:'+lengths[i]+':trunc"');
    const maximum=i===0?24:i<3?60:1000;
    passes('var ok=false;try{second({smallestUnit:"'+units[i]+'",roundingIncrement:'+maximum+'})}catch(e){ok=e instanceof RangeError}ok');
}
for (const options of ['null','1','"second"','true'])
    passes('var ok=false;try{second('+options+')}catch(e){ok=e instanceof TypeError}ok');
for (const options of ['{largestUnit:"day"}','{smallestUnit:"day"}','{smallestUnit:"auto"}','{largestUnit:"second",smallestUnit:"minute"}','{roundingIncrement:0}','{roundingIncrement:Infinity}','{smallestUnit:"second",roundingIncrement:7}'])
    passes('var ok=false;try{second('+options+')}catch(e){ok=e instanceof RangeError}ok');
console.log("temporal difference options passed");
