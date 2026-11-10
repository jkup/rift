import { registerTemporalPlainDateTimeWith } from "./temporal-plain-date-time-with.js";
import { registerTemporalPlainDateTimeParts } from "./temporal-plain-date-time-parts.js";
import { registerTemporalPlainDateTimeConversion } from "./temporal-plain-date-time-conversion.js";
import { registerTemporalPlainDateTimeFormat } from "./temporal-plain-date-time-format.js";
import type { Realm } from "../realm.js";
import type { TimeFields } from "../temporal-time.js";
import { temporalInteger } from "../temporal-integer.js";
import { createTemporalPlainDateTime, temporalPlainDateTimeValue } from "../temporal-plain-date-time-object.js";
import { isoDateTimeWithinLimits } from "../iso-date-time.js";
import { temporalCalendarField, temporalCalendarFields } from "./temporal-calendar-fields.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateTime(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalPlainDateTimePrototype;
    const constructor = realm.createBuiltinConstructor("PlainDateTime", 3,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.PlainDateTime requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const fields: number[] = [];
            for (let i = 0; i < 9; i++) {
                const value = i < args.length ? args[i] : UNDEFINED;
                if (i >= 3 && value.kind === "undefined") { fields.push(0); continue; }
                const field = temporalInteger(value, context, loc);
                if (field.type === "throw") return field;
                fields.push(field.value);
            }
            const calendar = args.length < 10 ? UNDEFINED : args[9];
            if (calendar.kind !== "undefined") {
                if (calendar.kind !== "string") return languageFailure(context.realm, "TypeError", "calendar must be a string", loc);
                if (calendar.value.length !== 7 || calendar.value.toLowerCase() !== "iso8601")
                    return languageFailure(context.realm, "RangeError", "unsupported calendar", loc);
            }
            const dateTime = { date: { year: fields[0], month: fields[1], day: fields[2] },
                hour: fields[3], minute: fields[4], second: fields[5], millisecond: fields[6], microsecond: fields[7], nanosecond: fields[8] };
            if (!isoDateTimeWithinLimits(dateTime)) return languageFailure(context.realm, "RangeError", "date-time is invalid or outside its range", loc);
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.PlainDateTime", context, loc);
            return proto.type === "throw" ? proto : createTemporalPlainDateTime(dateTime, proto.value, context, loc);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    prototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.PlainDateTime" }, writable: false, enumerable: false, configurable: true });
    for (const name of temporalCalendarFields) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const value = temporalPlainDateTimeValue(receiver, context, loc);
            return value.type === "throw" ? value : normal(temporalCalendarField(value.value.date, name));
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    const timeFields: (keyof TimeFields)[] = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"];
    for (const name of timeFields) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const value = temporalPlainDateTimeValue(receiver, context, loc);
            return value.type === "throw" ? value : normal({ kind: "number", value: value.value[name] });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion =>
        languageFailure(context.realm, "TypeError", "Temporal.PlainDateTime cannot be converted to a primitive number", loc));
    registerTemporalPlainDateTimeFormat(realm);
    registerTemporalPlainDateTimeWith(realm);
    registerTemporalPlainDateTimeParts(realm);
    registerTemporalPlainDateTimeConversion(realm, constructor);
    namespace.bootstrapDefine("PlainDateTime", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
