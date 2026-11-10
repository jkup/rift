import type { Realm } from "../realm.js";
import { registerTemporalPlainDateWith } from "./temporal-plain-date-with.js";
import { registerTemporalPlainDateConversion } from "./temporal-plain-date-conversion.js";
import { registerTemporalPlainDateFormat } from "./temporal-plain-date-format.js";
import { temporalInteger } from "../temporal-integer.js";
import { createTemporalPlainDate, temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { isISOLeapYear, isoDayOfWeek, isoDaysInMonth } from "../iso-calendar.js";
import { isoDateWithinLimits, isoDayOfYear, isoWeekOfYear } from "../iso-calendar-fields.js";
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
    const names = ["calendarId", "era", "eraYear", "year", "month", "monthCode", "day", "dayOfWeek", "dayOfYear", "weekOfYear", "yearOfWeek", "daysInWeek", "daysInMonth", "daysInYear", "monthsInYear", "inLeapYear"];
    for (const name of names) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const date = temporalPlainDateValue(receiver, context, loc);
            if (date.type === "throw") return date;
            const value = date.value;
            switch (name) {
                case "calendarId": return normal({ kind: "string", value: "iso8601" });
                case "era": case "eraYear": return normal(UNDEFINED);
                case "year": return normal({ kind: "number", value: value.year });
                case "month": return normal({ kind: "number", value: value.month });
                case "day": return normal({ kind: "number", value: value.day });
                case "monthCode": return normal({ kind: "string", value: "M" + String(value.month).padStart(2, "0") });
                case "daysInWeek": return normal({ kind: "number", value: 7 });
                case "monthsInYear": return normal({ kind: "number", value: 12 });
                case "daysInMonth": return normal({ kind: "number", value: isoDaysInMonth(value.year, value.month) });
                case "daysInYear": return normal({ kind: "number", value: isISOLeapYear(value.year) ? 366 : 365 });
                case "inLeapYear": return normal({ kind: "boolean", value: isISOLeapYear(value.year) });
                case "dayOfWeek": case "dayOfYear": {
                    const day = name === "dayOfWeek" ? isoDayOfWeek(value) : isoDayOfYear(value);
                    if (day === null) throw new Error("PlainDate field invariant");
                    return normal({ kind: "number", value: day });
                }
                default: {
                    const week = isoWeekOfYear(value);
                    if (week === null) throw new Error("PlainDate week invariant");
                    return normal({ kind: "number", value: name === "weekOfYear" ? week.week : week.year });
                }
            }
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion =>
        languageFailure(context.realm, "TypeError", "Temporal.PlainDate cannot be converted to a primitive number", loc));
    registerTemporalPlainDateFormat(realm);
    registerTemporalPlainDateConversion(realm, constructor);
    registerTemporalPlainDateWith(realm);
    namespace.bootstrapDefine("PlainDate", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
