import type { Realm } from "../realm.js";
import { formatTemporalTime } from "../temporal-time-format.js";
import type { Location } from "../syntax.js";
import { createTemporalPlainTime, temporalPlainTimeValue, type TimeFields } from "../temporal-plain-time-object.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber, type NumberCompletion } from "../conversion.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type Value, type ValueCompletion, type OperationContext } from "../runtime.js";

function timeInteger(value: Value, context: OperationContext, loc: Location): NumberCompletion {
    if (value.kind === "undefined") return { type: "normal", value: 0 };
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const converted = toNumber(primitive.value, loc, context.realm);
    if (converted.type === "throw") return converted;
    if (!Number.isFinite(converted.value)) return languageFailure(context.realm, "RangeError", "time field must be finite", loc);
    const integer = Math.trunc(converted.value);
    return { type: "normal", value: integer === 0 ? 0 : integer };
}

export function registerTemporalPlainTime(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalPlainTimePrototype;
    const constructor = realm.createBuiltinConstructor("PlainTime", 0,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.PlainTime requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const fields: number[] = [];
            for (let i = 0; i < 6; i++) {
                const converted = timeInteger(i < args.length ? args[i] : UNDEFINED, context, loc);
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
    namespace.bootstrapDefine("PlainTime", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
