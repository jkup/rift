import { registerTemporalPlainTimeConversion } from "./temporal-plain-time-conversion.js";
import { temporalTimeInteger } from "../temporal-time-fields.js";
import { registerTemporalPlainTimeWith } from "./temporal-plain-time-with.js";
import { registerTemporalPlainTimeRound } from "./temporal-plain-time-round.js";
import { registerTemporalPlainTimeString } from "./temporal-plain-time-string.js";
import type { Realm } from "../realm.js";
import { formatTemporalTime } from "../temporal-time-format.js";
import { createTemporalPlainTime, temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import type { TimeFields } from "../temporal-time.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainTime(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalPlainTimePrototype;
    const constructor = realm.createBuiltinConstructor("PlainTime", 0,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.PlainTime requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const fields: number[] = [];
            for (let i = 0; i < 6; i++) {
                const value = i < args.length ? args[i] : UNDEFINED;
                if (value.kind === "undefined") { fields.push(0); continue; }
                const converted = temporalTimeInteger(value, context, loc);
                if (converted.type === "throw") return converted;
                fields.push(converted.value);
            }
            for (let i = 0; i < fields.length; i++) {
                const limit = i === 0 ? 24 : i < 3 ? 60 : 1000;
                if (fields[i] < 0 || fields[i] >= limit) return languageFailure(context.realm, "RangeError", "time field is outside its range", loc);
            }
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.PlainTime", context, loc);
            if (proto.type === "throw") return proto;
            return createTemporalPlainTime({ hour: fields[0], minute: fields[1], second: fields[2],
                millisecond: fields[3], microsecond: fields[4], nanosecond: fields[5] }, proto.value, context, loc);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    prototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.PlainTime" }, writable: false, enumerable: false, configurable: true });
    const names: (keyof TimeFields)[] = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"];
    for (const name of names) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const time = temporalPlainTimeValue(receiver, context, loc);
            return time.type === "throw" ? time : normal({ kind: "number", value: time.value[name] });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion =>
        languageFailure(context.realm, "TypeError", "Temporal.PlainTime cannot be converted to a primitive number", loc));
    for (const name of ["toJSON", "toLocaleString"]) {
        realm.registerBuiltin(prototype, name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const time = temporalPlainTimeValue(receiver, context, loc);
            if (time.type === "throw") return time;
            const formatted = formatTemporalTime(time.value);
            if (formatted === null) throw new Error("automatic time precision invariant");
            return normal({ kind: "string", value: formatted });
        });
    }
    registerTemporalPlainTimeString(realm);
    registerTemporalPlainTimeRound(realm);
    registerTemporalPlainTimeWith(realm);
    registerTemporalPlainTimeConversion(realm, constructor);
    namespace.bootstrapDefine("PlainTime", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
