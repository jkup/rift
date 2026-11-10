import type { Realm } from "../realm.js";
import { createTemporalDuration, temporalDurationValue } from "../temporal-duration-object.js";
import { durationSign, isValidDuration, type DurationFields } from "../temporal-duration.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber } from "../conversion.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalDuration(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalDurationPrototype;
    const constructor = realm.createBuiltinConstructor("Duration", 0,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.Duration requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const fields: number[] = [];
            for (let i = 0; i < 10; i++) {
                const value = i < args.length ? args[i] : UNDEFINED;
                if (value.kind === "undefined") { fields.push(0); continue; }
                const primitive = toPrimitive(value, "number", context, loc);
                if (primitive.type === "throw") return primitive;
                const converted = toNumber(primitive.value, loc, context.realm);
                if (converted.type === "throw") return converted;
                if (!Number.isInteger(converted.value)) return languageFailure(context.realm, "RangeError", "duration fields must be finite integers", loc);
                fields.push(converted.value === 0 ? 0 : converted.value);
            }
            const duration: DurationFields = { years: fields[0], months: fields[1], weeks: fields[2], days: fields[3], hours: fields[4],
                minutes: fields[5], seconds: fields[6], milliseconds: fields[7], microseconds: fields[8], nanoseconds: fields[9] };
            if (!isValidDuration(duration)) return languageFailure(context.realm, "RangeError", "duration has mixed signs or exceeds its range", loc);
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.Duration", context, loc);
            return proto.type === "throw" ? proto : createTemporalDuration(duration, proto.value, context, loc);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    prototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.Duration" }, writable: false, enumerable: false, configurable: true });
    const names: (keyof DurationFields)[] = ["years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds", "microseconds", "nanoseconds"];
    for (const name of names) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const duration = temporalDurationValue(receiver, context, loc);
            return duration.type === "throw" ? duration : normal({ kind: "number", value: duration.value[name] });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    for (const name of ["sign", "blank"]) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const duration = temporalDurationValue(receiver, context, loc);
            if (duration.type === "throw") return duration;
            const sign = durationSign(duration.value);
            return name === "sign" ? normal({ kind: "number", value: sign }) : normal({ kind: "boolean", value: sign === 0 });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion =>
        languageFailure(context.realm, "TypeError", "Temporal.Duration cannot be converted to a primitive number", loc));
    namespace.bootstrapDefine("Duration", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
