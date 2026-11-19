import { RandomState } from "../src/random.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { type Value, type GuestObject, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(realm: Realm, text: string): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "math-random", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare random");
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("missing own property");
    }
    return descriptor.value;
}
function method(realm: Realm): Value {
    const math = own(realm.globalObject, "Math");
    if (math.kind !== "object") {
        throw new Error("Math object");
    }
    return own(math.object, "random");
}
function number(realm: Realm, text: string, expected: number): void {
    const result = run(realm, text);
    check(
        result.type === "normal" &&
            result.value.kind === "number" &&
            result.value.value === expected,
        text,
    );
}
const words = [
    11520, 0, 5927040, 70819200, 2031721883, 1637235492, 1287239034, 3734860849, 3729100597,
    4258142804, 337829053, 2142557243, 3576906021, 2006103318, 3870238204, 1001584594,
];
const state = new RandomState(1, 2, 3, 4),
    doubles: number[] = [];
for (const word of words) {
    check(state.nextWord() === word, "independent C reference vector");
}
for (let i = 0; i < words.length; i += 2) {
    doubles.push(((words[i] >>> 5) * 67108864 + (words[i + 1] >>> 6)) / 9007199254740992);
}
{
    const realm = fresh();
    realm.randomState = new RandomState(1, 2, 3, 4);
    for (const expected of doubles) {
        number(realm, "Math.random()", expected);
    }
}
{
    const caller = fresh(),
        owner = fresh();
    caller.randomState = new RandomState(1, 2, 3, 4);
    owner.randomState = new RandomState(1, 2, 3, 4);
    caller.defineScriptGlobal("foreignRandom", { value: method(owner) });
    number(caller, "foreignRandom.call(null)", doubles[0]);
    number(caller, "Math.random.call({valueOf(){throw 7}},Symbol())", doubles[0]);
    number(owner, "Math.random()", doubles[1]);
    number(caller, "Math.random()", doubles[1]);
    check(caller.randomState !== owner.randomState, "separate Realm states");
}
for (const seeded of [false, true]) {
    let reached = false;
    for (let maxSteps = 0; maxSteps < 30; maxSteps++) {
        const realm = fresh();
        if (seeded) {
            realm.randomState = new RandomState(1, 2, 3, 4);
        }
        const prepared = prepareBoundedScript(
            { id: "random-budget", text: "Math.random()" },
            realm,
        );
        if (prepared.kind !== "ready") {
            throw new Error("budget prepare");
        }
        const result = evaluateScript(
            createScriptSession({ maxSteps, maxCalls: 64 }),
            prepared.record,
        ).completion;
        if (result.type === "normal") {
            reached = true;
            break;
        }
        check(
            result.type === "throw" && result.origin.kind === "resource-limit",
            "budget completion",
        );
        if (seeded) {
            number(realm, "Math.random()", doubles[0]);
        } else {
            check(realm.randomState === null, "budget before seeding");
        }
    }
    check(reached, "random completes within budget");
}
{
    const zero = new RandomState(0, 0, 0, 0),
        corrected = new RandomState(0, 0, 0, 1);
    let nonzero = false;
    for (let i = 0; i < 32; i++) {
        const word = zero.nextWord();
        check(word === corrected.nextWord(), "zero state normalization");
        if (word !== 0) {
            nonzero = true;
        }
    }
    check(nonzero, "no absorbing zero state");
}
{
    const realm = fresh();
    check(realm.randomState === null, "lazy initialization");
    const result = run(
        realm,
        "var ok=true;for(var i=0;i<1000;i++){var n=Math.random();if(!(n>=0&&n<1)||!Number.isInteger(n*9007199254740992))ok=false}ok",
    );
    check(
        result.type === "normal" &&
            result.value.kind === "boolean" &&
            result.value.value &&
            realm.randomState !== null,
        "host seeded range",
    );
    const metadata = run(
        realm,
        "var d=Object.getOwnPropertyDescriptor(Math,'random'),r='';try{new Math.random()}catch(e){r=e.name}d.value.name+':'+d.value.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r",
    );
    check(
        metadata.type === "normal" &&
            metadata.value.kind === "string" &&
            metadata.value.value === "random:0:true:false:true:TypeError",
        "random metadata",
    );
}
console.log("Math random passed");
