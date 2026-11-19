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
    const prepared = prepareBoundedScript({ id: "duration-sign", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const r = run(text);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
const names = [
    "years",
    "months",
    "weeks",
    "days",
    "hours",
    "minutes",
    "seconds",
    "milliseconds",
    "microseconds",
    "nanoseconds",
];
for (const name of names) {
    passes(
        "var a=new Temporal.Duration(1,2,3,4,5,6,7,8,9,10),b=a.negated(),c=b.abs();b." +
            name +
            "===-a." +
            name +
            "&&c." +
            name +
            "===a." +
            name,
    );
    passes(
        "Object.is(new Temporal.Duration().negated()." +
            name +
            ",0)&&Object.is(new Temporal.Duration().abs()." +
            name +
            ",0)",
    );
}
for (const method of ["negated", "abs"]) {
    passes(
        "var a=new Temporal.Duration(),b=a." + method + "();a!==b&&b.blank&&Object.is(b.sign,0)",
    );
    passes(
        "class D extends Temporal.Duration{}var a=new D(1),b=a." +
            method +
            "();!(b instanceof D)&&Object.getPrototypeOf(b)===Temporal.Duration.prototype",
    );
    passes(
        'var a=new Temporal.Duration(1);Object.defineProperty(a,"years",{get(){throw 1}});Object.defineProperty(a,"constructor",{get(){throw 2}});a.' +
            method +
            "().years===" +
            (method === "abs" ? 1 : -1),
    );
    passes(
        "var a=new Temporal.Duration(1);Object.setPrototypeOf(a,null);Temporal.Duration.prototype." +
            method +
            ".call(a).years===" +
            (method === "abs" ? 1 : -1),
    );
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable',
    );
    for (const receiver of [
        "null",
        "undefined",
        "{}",
        "Temporal.Duration.prototype",
        "new Temporal.PlainTime()",
    ]) {
        passes(
            "var ok=false;try{Temporal.Duration.prototype." +
                method +
                ".call(" +
                receiver +
                ")}catch(e){ok=e instanceof TypeError}ok",
        );
    }
}
passes("var a=new Temporal.Duration(1),b=a.abs();a!==b&&a.sign===1&&b.sign===1");
passes(
    "new Temporal.Duration(-1).negated().sign===1&&new Temporal.Duration(1).negated().sign===-1",
);
passes(
    "var a=new Temporal.Duration(0,0,0,0,0,0,0,9007199254740992),b=a.negated();b.milliseconds===-9007199254740992&&b.abs().milliseconds===9007199254740992",
);
passes(
    "var a=new Temporal.Duration(0,0,0,0,0,0,9007199254740991,999,999,999);a.negated().abs().nanoseconds===999&&a.negated().seconds===-9007199254740991",
);
for (const name of ["negated", "abs"]) {
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const method = run("Temporal.Duration.prototype." + name, defining);
    if (method.type !== "normal") {
        throw new Error("method lookup");
    }
    calling.defineScriptGlobal("transform", { value: method.value });
    const result = run("transform.call(new Temporal.Duration(1))", calling);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === defining.temporalDurationPrototype,
        "defining Realm result",
    );
    const failed = run("transform.call({})", calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
console.log("temporal duration sign passed");
