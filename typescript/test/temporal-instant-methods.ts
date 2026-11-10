import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value, ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-instant-methods", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function own(realm: Realm, name: string): Value {
    const descriptor = realm.globalObject.getOwnProperty(name);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("missing " + name);
    return descriptor.value;
}
const cases = [
    "new Temporal.Instant(0n).toJSON()===\"1970-01-01T00:00:00Z\"&&new Temporal.Instant(-1n).toJSON()===\"1969-12-31T23:59:59.999999999Z\"",
    "JSON.stringify({x:new Temporal.Instant(123400000n)})==='{\"x\":\"1970-01-01T00:00:00.1234Z\"}'",
    "var x=new Temporal.Instant(0n);x.toString=function(){throw 1};x.valueOf=function(){throw 2};x.toJSON()===\"1970-01-01T00:00:00Z\"",
    "new Temporal.Instant(0n).toLocaleString({get locale(){throw 1}},{get timeZone(){throw 2}})===\"1970-01-01T00:00:00Z\"",
    "new Temporal.Instant(1500000n).round(\"millisecond\").epochNanoseconds===2000000n",
    "new Temporal.Instant(-1500000n).round(\"millisecond\").epochNanoseconds===-1000000n",
    "new Temporal.Instant(-1n).round({smallestUnit:\"millisecond\",roundingMode:\"trunc\"}).epochNanoseconds===-1000000n",
    "new Temporal.Instant(123456789n).round(\"nanoseconds\").epochNanoseconds===123456789n",
    "new Temporal.Instant(1800000000000n).round(\"hour\").epochNanoseconds===3600000000000n",
    "new Temporal.Instant(30000000000n).round(\"minute\").epochNanoseconds===60000000000n",
    "new Temporal.Instant(500000000n).round(\"second\").epochNanoseconds===1000000000n",
    "new Temporal.Instant(1500n).round(\"microseconds\").epochNanoseconds===2000n",
    "new Temporal.Instant(13000000000000n).round({smallestUnit:\"hour\",roundingIncrement:6}).epochNanoseconds===21600000000000n",
    "new Temporal.Instant(50000000000000n).round({smallestUnit:\"hour\",roundingIncrement:24}).epochNanoseconds===86400000000000n",
    "new Temporal.Instant(1000n).round({smallestUnit:\"microsecond\",roundingIncrement:1.9}).epochNanoseconds===1000n",
    "new Temporal.Instant(1000000000n).round({smallestUnit:\"nanosecond\",roundingIncrement:1000000000.9}).epochNanoseconds===1000000000n",
    "var x=new Temporal.Instant(1n),y=x.round(\"nanosecond\");x!==y&&x.epochNanoseconds===1n&&y.epochNanoseconds===1n",
    "class Sub extends Temporal.Instant{}var x=new Sub(1n);Object.getPrototypeOf(x.round(\"nanosecond\"))===Temporal.Instant.prototype",
    "var x=new Temporal.Instant(1n);Object.defineProperty(x,\"constructor\",{get(){throw 1}});x.round(\"nanosecond\").epochNanoseconds===1n",
    "var trace=\"\",options={get roundingIncrement(){trace+=\"I\";return{valueOf(){trace+=\"N\";return 1}}},get roundingMode(){trace+=\"M\";return{toString(){trace+=\"S\";return \"trunc\"}}},get smallestUnit(){trace+=\"U\";return{toString(){trace+=\"T\";return \"second\"}}}};new Temporal.Instant(1n).round(options);trace===\"INMSUT\"",
    "var trace=\"\",options={get roundingIncrement(){trace+=\"I\";return NaN},get roundingMode(){trace+=\"M\";return \"trunc\"},get smallestUnit(){trace+=\"U\";return \"second\"}};try{new Temporal.Instant(1n).round(options)}catch(e){trace+=e instanceof RangeError?\"R\":\"?\"}trace===\"IR\"",
    "var trace=\"\",options={get roundingMode(){trace+=\"M\";return \"bad\"},get smallestUnit(){trace+=\"U\";return \"second\"}};try{new Temporal.Instant(1n).round(options)}catch(e){trace+=e instanceof RangeError?\"R\":\"?\"}trace===\"MR\"",
    "var n=0,options={get roundingIncrement(){n++;return 1}};try{Temporal.Instant.prototype.round.call({},options)}catch(e){}n===0",
    "var options=function(){};options.smallestUnit=\"nanosecond\";new Temporal.Instant(1n).round(options).epochNanoseconds===1n",
    "Temporal.Instant.prototype.round.length===1&&Temporal.Instant.prototype.toJSON.length===0&&Temporal.Instant.prototype.toLocaleString.length===0",
    "var d=Object.getOwnPropertyDescriptor(Temporal.Instant.prototype,\"round\");d.writable&&!d.enumerable&&d.configurable",
    "new Temporal.Instant(8640000000000000000000n).round(\"hour\").epochNanoseconds===8640000000000000000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"ceil\"}).epochNanoseconds===-1000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"floor\"}).epochNanoseconds===-2000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"expand\"}).epochNanoseconds===-1000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"trunc\"}).epochNanoseconds===-2000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"halfCeil\"}).epochNanoseconds===-1000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"halfFloor\"}).epochNanoseconds===-2000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"halfExpand\"}).epochNanoseconds===-1000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"halfTrunc\"}).epochNanoseconds===-2000000n",
    "new Temporal.Instant(-1500000n).round({smallestUnit:\"millisecond\",roundingMode:\"halfEven\"}).epochNanoseconds===-2000000n",
    "var ok=false;try{new Temporal.Instant(0n).round(undefined)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round(null)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round(1)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round(\"day\")}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round(\"auto\")}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:\"second\",roundingIncrement:7})}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:\"hour\",roundingIncrement:25})}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:\"nanosecond\",roundingIncrement:1000000001})}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:\"second\",roundingIncrement:0})}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:\"second\",roundingIncrement:Infinity})}catch(e){ok=e instanceof RangeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:\"second\",roundingIncrement:1n})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:Symbol()})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{new Temporal.Instant(0n).round({smallestUnit:\"second\",roundingMode:Symbol()})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Temporal.Instant.prototype.round.call({})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Temporal.Instant.prototype.toJSON.call({})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Temporal.Instant.prototype.toLocaleString.call({})}catch(e){ok=e instanceof TypeError}ok"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "instant methods case " + i);
}
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
run("var round=Temporal.Instant.prototype.round;var json=Temporal.Instant.prototype.toJSON", defining);
calling.defineScriptGlobal("round", { value: own(defining, "round") });
calling.defineScriptGlobal("json", { value: own(defining, "json") });
const result = run('round.call(new Temporal.Instant(1n), "nanosecond")', calling);
check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === defining.temporalInstantPrototype, "round result defining Realm");
const serialized = run('json.call(new Temporal.Instant(0n))', calling);
check(serialized.type === "normal" && serialized.value.kind === "string" && serialized.value.value === "1970-01-01T00:00:00Z", "cross-Realm brand");
const failed = run('round.call({})', calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"), "method error defining Realm");
console.log("temporal instant methods passed");
