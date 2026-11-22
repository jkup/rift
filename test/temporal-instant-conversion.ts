import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value, ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm: Realm): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-instant-conversion", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function own(realm: Realm, name: string): Value {
    const property = realm.globalObject.getOwnProperty(name);
    if (property === undefined || property.kind !== "data") {
        throw new Error("missing " + name);
    }
    return property.value;
}
const cases = [
    `Temporal.Instant.from("1970-01-01T00Z").epochNanoseconds===0n`,
    `Temporal.Instant.from("1969-12-31T23:59:59.999999999Z").epochNanoseconds===-1n`,
    `var a=new Temporal.Instant(9007199254740993n),b=Temporal.Instant.from(a);a!==b&&b.epochNanoseconds===9007199254740993n`,
    `var a=new Temporal.Instant(1n);a[Symbol.toPrimitive]=function(){throw 1};a.toString=function(){throw 2};Temporal.Instant.from(a).epochNanoseconds===1n`,
    `class Child extends Temporal.Instant{}var a=new Child(1n),b=Child.from(a);b!==a&&Object.getPrototypeOf(b)===Temporal.Instant.prototype`,
    `Temporal.Instant.from.call(null,"1970-01-01T00Z").epochNanoseconds===0n`,
    `var trace="";var a={[Symbol.toPrimitive](hint){trace+=hint;return "1970-01-01T00Z"}};Temporal.Instant.from(a);trace==="string"`,
    `var trace="";var a={toString(){trace+="S";return {}},valueOf(){trace+="V";return "1970-01-01T00Z"}};Temporal.Instant.from(a);trace==="SV"`,
    `Temporal.Instant.from(new String("1970-01-01T00Z")).epochNanoseconds===0n`,
    `Temporal.Instant.compare(new Temporal.Instant(1n),new Temporal.Instant(2n))===-1&&Temporal.Instant.compare(new Temporal.Instant(2n),new Temporal.Instant(1n))===1`,
    `Temporal.Instant.compare("1970-01-01T01+01","1970-01-01T00Z")===0`,
    `Temporal.Instant.compare(new Temporal.Instant(9007199254740993n),new Temporal.Instant(9007199254740992n))===1`,
    `var trace="";var a={toString(){trace+="A";return "1970-01-01T00Z"}},b={toString(){trace+="B";return "1970-01-01T00Z"}};Temporal.Instant.compare(a,b);trace==="AB"`,
    `var trace="";var a={toString(){trace+="A";throw 17}},b={toString(){trace+="B";return "1970-01-01T00Z"}};try{Temporal.Instant.compare(a,b)}catch(e){trace+=e}trace==="A17"`,
    `var trace="";try{Temporal.Instant.compare("bad",{toString(){trace+="B";return "1970-01-01T00Z"}})}catch(e){trace+=e instanceof RangeError?"R":"?"}trace==="R"`,
    `new Temporal.Instant(0n).equals("1970-01-01T00Z")&&!new Temporal.Instant(1n).equals("1970-01-01T00Z")`,
    `var trace="";try{Temporal.Instant.prototype.equals.call({}, {toString(){trace+="S";return "1970-01-01T00Z"}})}catch(e){trace+=e instanceof TypeError?"T":"?"}trace==="T"`,
    `var a=new Temporal.Instant(0n);a.constructor={get prototype(){throw 1}};Temporal.Instant.from(a).epochNanoseconds===0n`,
    `Temporal.Instant.from.length===1&&Temporal.Instant.compare.length===2&&Temporal.Instant.prototype.equals.length===1`,
    `var d=Object.getOwnPropertyDescriptor(Temporal.Instant,"from");d.writable&&!d.enumerable&&d.configurable`,
    `var d=Object.getOwnPropertyDescriptor(Temporal.Instant.prototype,"equals");d.writable&&!d.enumerable&&d.configurable`,
    `var caught=false;try{new Temporal.Instant.from("1970-01-01T00Z")}catch(e){caught=e instanceof TypeError}caught`,
    `Temporal.Instant.from("+275760-09-13T23:59:59+23:59:59").epochNanoseconds===8640000000000000000000n`,
];
for (const value of [
    "undefined",
    "null",
    "true",
    "0",
    "0n",
    "Symbol()",
    "{[Symbol.toPrimitive](){return 0n}}",
    "{toString(){return {}},valueOf(){return {}}}",
]) {
    cases.push(
        "var ok=false;try{Temporal.Instant.from(" +
            value +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const text of [
    "bad",
    "1970-01-01",
    "1900-02-29T00Z",
    "1970-01-01T00Z[!x=y]",
    "+275760-09-13T00:00:00.000000001Z",
]) {
    cases.push(
        "var ok=false;try{Temporal.Instant.from(" +
            JSON.stringify(text) +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const expression of [
    "Temporal.Instant.from(z).epochNanoseconds===9007199254740993n",
    "Temporal.Instant.compare(z,new Temporal.Instant(9007199254740992n))===1",
    "Temporal.Instant.compare(new Temporal.Instant(9007199254740994n),z)===1",
    "new Temporal.Instant(9007199254740993n).equals(z)",
    "new Temporal.Instant(9007199254740994n).since(z).nanoseconds===1",
    "new Temporal.Instant(9007199254740992n).until(z).nanoseconds===1",
]) {
    cases.push(
        'var z=new Temporal.ZonedDateTime(9007199254740993n,"+01:00");for(var key of [Symbol.toPrimitive,"toString","valueOf","epochNanoseconds"]){Object.defineProperty(z,key,{get(){throw 42}})}' +
            expression,
    );
}
for (const epoch of ["-8640000000000000000000n", "8640000000000000000000n"]) {
    cases.push(
        "Temporal.Instant.from(new Temporal.ZonedDateTime(" +
            epoch +
            ',"UTC")).epochNanoseconds===' +
            epoch,
    );
}
cases.push(
    'class Child extends Temporal.ZonedDateTime{}var z=new Child(1n,"UTC");var a=Temporal.Instant.from(z),b=Temporal.Instant.from(z);a!==b&&a!==z&&a.epochNanoseconds===1n&&Object.getPrototypeOf(a)===Temporal.Instant.prototype',
    'var fake=Object.create(Temporal.ZonedDateTime.prototype);fake.toString=function(){return "1970-01-01T00:00:00.000000007Z"};fake.epochNanoseconds=42n;Temporal.Instant.from(fake).epochNanoseconds===7n',
    "var ok=false;try{Temporal.Instant.from(Object.create(Temporal.ZonedDateTime.prototype))}catch(e){ok=e instanceof TypeError}ok",
);
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        "conversion case " + i,
    );
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
run("var from=Temporal.Instant.from;var equals=Temporal.Instant.prototype.equals", defining);
calling.defineScriptGlobal("from", { value: own(defining, "from") });
calling.defineScriptGlobal("equals", { value: own(defining, "equals") });
const cloned = run("from(new Temporal.Instant(1n))", calling);
check(
    cloned.type === "normal" &&
        cloned.value.kind === "object" &&
        cloned.value.object.getPrototypeOf() === defining.temporalInstantPrototype,
    "defining Realm allocation",
);
const zonedClone = run('from(new Temporal.ZonedDateTime(1n,"UTC"))', calling);
check(
    zonedClone.type === "normal" &&
        zonedClone.value.kind === "object" &&
        zonedClone.value.object.getPrototypeOf() === defining.temporalInstantPrototype,
    "cross-Realm ZonedDateTime allocation",
);
const equal = run('equals.call(new Temporal.Instant(0n),"1970-01-01T00Z")', calling);
check(
    equal.type === "normal" && equal.value.kind === "boolean" && equal.value.value,
    "cross-Realm brand",
);
const failed = run('from("bad")', calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"),
    "defining Realm error",
);
calling.defineScriptGlobal("longInput", {
    value: { kind: "string", value: "1970-01-01T00Z[x=" + "a".repeat(1000) + "]" },
});
const prepared = prepareBoundedScript(
    { id: "instant-budget", text: "try{from(longInput)}catch(e){true}" },
    calling,
);
if (prepared.kind !== "ready") {
    throw new Error("budget preparation");
}
const session = createScriptSession({ maxSteps: 200, maxCalls: 64 });
const stopped = evaluateScript(session, prepared.record).completion;
check(
    stopped.type === "throw" && stopped.origin.kind === "resource-limit",
    "parsing work charged before scanning",
);
check(
    session.inspect().active === null &&
        session.inspect().calls === 0 &&
        session.inspect().depth === 0,
    "budget cleanup",
);
console.log("temporal instant conversion passed");
