import { registerTemporalPlainDateToMonthDay } from "./temporal-plain-date-to-month-day.js";
import { registerTemporalPlainDateToYearMonth } from "./temporal-plain-date-to-year-month.js";
import { registerTemporalPlainDateToDateTime } from "./temporal-plain-date-to-date-time.js";
import type { Realm } from "../realm.js";
import { registerTemporalPlainDateDifference } from "./temporal-plain-date-difference.js";
import { registerTemporalPlainDateArithmetic } from "./temporal-plain-date-arithmetic.js";
import { registerTemporalPlainDateWith } from "./temporal-plain-date-with.js";
import { registerTemporalPlainDateConversion } from "./temporal-plain-date-conversion.js";
import { registerTemporalPlainDateFormat } from "./temporal-plain-date-format.js";
import { temporalInteger } from "../temporal-integer.js";
import { createTemporalPlainDate, temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { temporalCalendarField, temporalCalendarFields } from "./temporal-calendar-fields.js";
import { isoDateWithinLimits } from "../iso-calendar-fields.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDate(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalPlainDatePrototype;
    const constructor = realm.createBuiltinConstructor("PlainDate", 3,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.PlainDate requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const fields: number[] = [];
            for (let i = 0; i < 3; i++) {
                const field = temporalInteger(i < args.length ? args[i] : UNDEFINED, context, loc);
                if (field.type === "throw") return field;
                fields.push(field.value);
            }
            const calendar = args.length < 4 ? UNDEFINED : args[3];
            if (calendar.kind !== "undefined") {
                if (calendar.kind !== "string") return languageFailure(context.realm, "TypeError", "calendar must be a string", loc);
                if (calendar.value.length !== 7 || calendar.value.toLowerCase() !== "iso8601")
                    return languageFailure(context.realm, "RangeError", "unsupported calendar", loc);
            }
            const date = { year: fields[0], month: fields[1], day: fields[2] };
            if (!isoDateWithinLimits(date)) return languageFailure(context.realm, "RangeError", "date is invalid or outside its range", loc);
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.PlainDate", context, loc);
            return proto.type === "throw" ? proto : createTemporalPlainDate(date, proto.value, context, loc);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    prototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.PlainDate" }, writable: false, enumerable: false, configurable: true });
    for (const name of temporalCalendarFields) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const date = temporalPlainDateValue(receiver, context, loc);
            if (date.type === "throw") return date;
            return normal(temporalCalendarField(date.value, name));
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion =>
        languageFailure(context.realm, "TypeError", "Temporal.PlainDate cannot be converted to a primitive number", loc));
    registerTemporalPlainDateFormat(realm);
    registerTemporalPlainDateConversion(realm, constructor);
    registerTemporalPlainDateWith(realm);
    registerTemporalPlainDateArithmetic(realm);
    registerTemporalPlainDateDifference(realm);
    registerTemporalPlainDateToDateTime(realm);
    registerTemporalPlainDateToYearMonth(realm);
    registerTemporalPlainDateToMonthDay(realm);
    namespace.bootstrapDefine("PlainDate", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
