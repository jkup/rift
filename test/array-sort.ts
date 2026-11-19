import { Realm } from "../src/realm.js";
import {
    GuestObject,
    normal,
    sameValue,
    type Value,
    type ValueCompletion,
    type OperationContext,
    type PropertyKey,
    type InternalBooleanCompletion,
} from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function num(value: number): Value {
    return { kind: "number", value };
}
function str(value: string): Value {
    return { kind: "string", value };
}
function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function own(object: GuestObject, key: string): Value {
    const d = object.getOwnProperty(key);
    if (d === undefined || d.kind !== "data") {
        throw new Error("own " + key);
    }
    return d.value;
}
function data(
    object: GuestObject,
    key: string,
    value: number,
    writable = true,
    configurable = true,
): void {
    object.bootstrapDefine(key, { value: num(value), writable, configurable });
}
function run(realm: Realm, text: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "sort", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare sort");
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const completion = evaluateScript(session, prepared.record).completion;
    check(
        session.inspect().active === null && session.inspect().calls === 0,
        "sort restores session",
    );
    return completion;
}
class Observed extends GuestObject {
    trace = "";
    internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion {
        this.trace += "has:" + key + ";";
        return super.internalHasProperty(key, loc);
    }
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        loc: Location,
    ): ValueCompletion {
        this.trace += "get:" + key + ";";
        return super.internalGet(key, receiver, context, loc);
    }
    internalSet(
        key: PropertyKey,
        value: Value,
        receiver: Value,
        context: OperationContext,
        loc: Location,
    ): InternalBooleanCompletion {
        this.trace += "set:" + key + ";";
        return super.internalSet(key, value, receiver, context, loc);
    }
    internalDelete(key: PropertyKey): InternalBooleanCompletion {
        this.trace += "delete:" + key + ";";
        return super.internalDelete(key);
    }
}
function fixture() {
    const realm = fresh(),
        target = new Observed(realm.objectPrototype);
    realm.defineScriptGlobal("target", { value: obj(target) });
    return { realm, target };
}
{
    const { realm, target } = fixture();
    data(target, "length", 4);
    data(target, "0", 3);
    data(target, "2", 1);
    data(realm.objectPrototype, "3", 2);
    const result = run(realm, "[].sort.call(target);");
    check(
        result.type === "normal" && sameValue(result.value, obj(target)),
        "sort receiver identity",
    );
    check(
        target.trace ===
            "get:length;has:0;get:0;has:1;has:2;get:2;has:3;get:3;set:0;set:1;set:2;delete:3;",
        "collect before ordered writeback and trailing deletion",
    );
    check(
        sameValue(own(target, "0"), num(1)) &&
            sameValue(own(target, "1"), num(2)) &&
            sameValue(own(target, "2"), num(3)) &&
            sameValue(own(target, "length"), num(4)),
        "sort values and unchanged length",
    );
}
{
    const { realm, target } = fixture();
    data(target, "length", 3);
    data(target, "0", 3);
    data(target, "1", 1, false);
    data(target, "2", 2);
    const result = run(realm, "[].sort.call(target);");
    check(
        result.type === "throw" && result.diagnostic.name === "TypeError",
        "strict sort write failure",
    );
    check(
        sameValue(own(target, "0"), num(1)) &&
            sameValue(own(target, "1"), num(1)) &&
            sameValue(own(target, "2"), num(2)),
        "sort preserves writes before failure",
    );
    check(target.trace.endsWith("set:0;set:1;"), "failed write stops later writes");
}
{
    const { realm, target } = fixture();
    data(target, "length", 3);
    data(target, "0", 3);
    data(target, "2", 1, true, false);
    const result = run(realm, "[].sort.call(target);");
    check(
        result.type === "throw" && result.diagnostic.name === "TypeError",
        "strict trailing delete failure",
    );
    check(
        sameValue(own(target, "0"), num(1)) &&
            sameValue(own(target, "1"), num(3)) &&
            sameValue(own(target, "2"), num(1)),
        "sorted writes survive failed deletion",
    );
}
{
    const { realm, target } = fixture();
    data(target, "length", 1);
    data(target, "0", 7, false);
    const result = run(realm, "[].sort.call(target);");
    check(
        result.type === "throw" &&
            result.diagnostic.name === "TypeError" &&
            target.trace.endsWith("set:0;"),
        "single element still strictly written",
    );
}
{
    const { realm, target } = fixture();
    data(target, "length", 0, false);
    const result = run(realm, "[].sort.call(target);");
    check(
        result.type === "normal" && target.trace === "get:length;",
        "empty sort does not set length",
    );
}
{
    const owner = fresh(),
        caller = fresh(),
        callbackRealm = fresh(),
        input = caller.createArray();
    data(input, "0", 2);
    data(input, "1", 1);
    let comparisons = 0,
        conversions = 0;
    const conversion = callbackRealm.createObject();
    conversion.bootstrapDefine(wellKnownToPrimitive, {
        value: obj(
            callbackRealm.createBuiltin(
                "convert",
                1,
                (receiver, args, context, _loc): ValueCompletion => {
                    check(
                        sameValue(receiver, obj(conversion)) &&
                            sameValue(args[0], str("number")) &&
                            context.realm === callbackRealm,
                        "sort numeric result hint and Realm",
                    );
                    conversions++;
                    return normal(num(1));
                },
            ),
        ),
    });
    const callback = callbackRealm.createBuiltin(
        "compare",
        2,
        (receiver, args, context, _loc): ValueCompletion => {
            check(
                receiver.kind === "undefined" &&
                    args.length === 2 &&
                    sameValue(args[0], num(2)) &&
                    sameValue(args[1], num(1)) &&
                    context.realm === callbackRealm,
                "sort callback tuple and Realm",
            );
            comparisons++;
            return normal(obj(conversion));
        },
    );
    caller.defineScriptGlobal("input", { value: obj(input) });
    caller.defineScriptGlobal("sort", { value: own(owner.arrayPrototype, "sort") });
    caller.defineScriptGlobal("compare", { value: obj(callback) });
    const result = run(caller, "sort.call(input,compare);");
    check(
        result.type === "normal" &&
            sameValue(result.value, obj(input)) &&
            sameValue(own(input, "0"), num(1)) &&
            comparisons === 1 &&
            conversions === 1,
        "foreign sort and result conversion",
    );
}
{
    const realm = fresh(),
        input = realm.createArray();
    input.bootstrapDefine("0", { value: str("\ue000"), writable: true, configurable: true });
    input.bootstrapDefine("1", { value: str("\ud83d\ude00"), writable: true, configurable: true });
    realm.defineScriptGlobal("input", { value: obj(input) });
    check(
        run(realm, "input.sort();").type === "normal" &&
            sameValue(own(input, "0"), str("\ud83d\ude00")),
        "default sort compares UTF-16 code units",
    );
}
{
    const { realm, target } = fixture();
    data(target, "length", 2);
    data(target, "0", 2);
    data(target, "1", 1);
    const result = run(realm, "[].sort.call(target,function(){throw target;});");
    check(
        result.type === "throw" &&
            sameValue(result.value, obj(target)) &&
            !target.trace.includes("set:"),
        "comparator throw before writeback",
    );
}
{
    let partial = false,
        completed = false;
    for (let steps = 1; steps < 100; steps++) {
        const { realm, target } = fixture();
        data(target, "length", 4);
        data(target, "0", 4);
        data(target, "1", 1);
        data(target, "2", 3);
        data(target, "3", 2);
        const result = run(realm, "[].sort.call(target);", steps);
        if (result.type === "throw") {
            check(result.origin.kind === "resource-limit", "sort resource origin");
            if (target.trace.includes("set:0;") && !target.trace.includes("set:3;")) {
                partial = true;
            }
        } else {
            completed = true;
        }
    }
    check(partial && completed, "sort bounded writeback and completion");
    const huge = run(fresh(), "[].sort.call({length:Infinity});", 40);
    check(
        huge.type === "throw" && huge.origin.kind === "resource-limit",
        "sort huge holes bounded",
    );
}
{
    const realm = fresh(),
        input = realm.createArray();
    for (let i = 0; i < 257; i++) {
        data(input, String(i), 256 - i);
    }
    realm.defineScriptGlobal("input", { value: obj(input) });
    check(
        run(realm, "input.sort(function(a,b){return a-b;});").type === "normal",
        "multiple merge widths",
    );
    for (let i = 0; i < 257; i++) {
        check(sameValue(own(input, String(i)), num(i)), "complete sorted sequence");
    }
}
const legacy = new Realm((_line: string) => {});
check(legacy.arrayPrototype.getOwnProperty("sort") === undefined, "sort Script only");
console.log("Array sort passed");
