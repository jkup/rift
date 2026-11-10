import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import { GuestTemporalZonedDateTime, createTemporalZonedDateTime, temporalZonedDateTimeObject } from "../temporal-zoned-date-time-object.js";
import { parseTemporalZonedDateTime, type TemporalZonedRecord } from "../temporal-zoned-parse.js";
import { interpretTemporalZonedDateTime, type TemporalOffsetOption } from "../temporal-zoned-interpret.js";
import { toTemporalTimeZone } from "../temporal-time-zone.js";
import type { TemporalTimeZone } from "../temporal-time-zone-parse.js";
import { temporalCalendarWithISODefault } from "../temporal-calendar.js";
import { readTemporalDateField, type TemporalDateFields } from "../temporal-date-fields.js";
import { resolveTemporalDateTimeFields } from "../temporal-date-time-fields.js";
import { temporalInteger } from "../temporal-integer.js";
import type { TimeFields } from "../temporal-time.js";
import { temporalOptionString, temporalOverflowReject } from "../temporal-options.js";
import { toPrimitive } from "../primitive-conversion.js";
import { parseUTCOffset } from "../utc-offset.js";
import { GuestObject, languageFailure, normal, UNDEFINED, type Value, type ValueCompletion, type OperationContext, type ThrowCompletion } from "../runtime.js";

function conversionOptions(value: Value, context: OperationContext, loc: Location): { type: "normal"; offset: TemporalOffsetOption; reject: boolean } | ThrowCompletion {
    let object: GuestObject;
    if (value.kind === "undefined") object = new GuestObject(null);
    else if (value.kind === "object") object = value.object;
    else return languageFailure(context.realm, "TypeError", "Temporal options must be an object", loc);
    const receiver: Value = { kind: "object", object };
    const disambiguation = object.internalGet("disambiguation", receiver, context, loc);
    if (disambiguation.type === "throw") return disambiguation;
    if (disambiguation.value.kind !== "undefined") {
        const converted = temporalOptionString(disambiguation.value, context, loc);
        if (converted.type === "throw") return converted;
        const text = converted.value;
        if (text !== "compatible" && text !== "earlier" && text !== "later" && text !== "reject")
            return languageFailure(context.realm, "RangeError", "invalid disambiguation option", loc);
    }
    const offset = object.internalGet("offset", receiver, context, loc);
    if (offset.type === "throw") return offset;
    let offsetOption: TemporalOffsetOption = "reject";
    if (offset.value.kind !== "undefined") {
        const converted = temporalOptionString(offset.value, context, loc);
        if (converted.type === "throw") return converted;
        const text = converted.value;
        if (text !== "reject" && text !== "prefer" && text !== "ignore" && text !== "use")
            return languageFailure(context.realm, "RangeError", "invalid offset option", loc);
        offsetOption = text;
    }
    const overflow = temporalOverflowReject(receiver, context, loc);
    return overflow.type === "throw" ? overflow : { type: "normal", offset: offsetOption, reject: overflow.value };
}

function fieldRecord(object: GuestObject, options: Value, context: OperationContext, loc: Location): { type: "normal"; record: TemporalZonedRecord; offset: TemporalOffsetOption } | ThrowCompletion {
    const calendar = temporalCalendarWithISODefault(object, context, loc);
    if (calendar.type === "throw") return calendar;
    const date: TemporalDateFields = { year: null, month: null, monthCode: null, day: null };
    const time = { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
    let timeZone: TemporalTimeZone | null = null, offsetNanoseconds: bigint | null = null;
    const names: (keyof TemporalDateFields | keyof TimeFields | "offset" | "timeZone")[] = ["day", "hour", "microsecond", "millisecond", "minute", "month", "monthCode", "nanosecond", "offset", "second", "timeZone", "year"];
    for (const name of names) {
        if (name === "day" || name === "month" || name === "monthCode" || name === "year") {
            const read = readTemporalDateField(object, name, date, context, loc);
            if (read.type === "throw") return read;
            continue;
        }
        const read = object.internalGet(name, { kind: "object", object }, context, loc);
        if (read.type === "throw") return read;
        if (name === "timeZone") {
            const zone = toTemporalTimeZone(read.value, context, loc);
            if (zone.type === "throw") return zone;
            timeZone = zone.value;
        } else if (read.value.kind !== "undefined") {
            if (name === "offset") {
                const primitive = toPrimitive(read.value, "string", context, loc);
                if (primitive.type === "throw") return primitive;
                if (primitive.value.kind !== "string") return languageFailure(context.realm, "TypeError", "offset must convert to a string", loc);
                offsetNanoseconds = parseUTCOffset(primitive.value.value);
                if (offsetNanoseconds === null) return languageFailure(context.realm, "RangeError", "invalid offset", loc);
            } else {
                const converted = temporalInteger(read.value, context, loc);
                if (converted.type === "throw") return converted;
                time[name] = converted.value;
            }
        }
    }
    if (timeZone === null) throw new Error("required timezone invariant");
    const settings = conversionOptions(options, context, loc);
    if (settings.type === "throw") return settings;
    const resolved = resolveTemporalDateTimeFields({ date, time }, settings.reject, context, loc);
    if (resolved.type === "throw") return resolved;
    return { type: "normal", offset: settings.offset, record: { dateTime: resolved.value, timeZone, startOfDay: false, offsetBehaviour: offsetNanoseconds === null ? "wall" : "option", offsetNanoseconds: offsetNanoseconds ?? 0n } };
}

export function toTemporalZonedFields(value: Value, options: Value, context: OperationContext, loc: Location): { type: "normal"; epoch: bigint; timeZone: TemporalTimeZone } | ThrowCompletion {
    let record: TemporalZonedRecord, offset: TemporalOffsetOption;
    if (value.kind === "object") {
        if (value.object instanceof GuestTemporalZonedDateTime) {
            const settings = conversionOptions(options, context, loc);
            return settings.type === "throw" ? settings : { type: "normal", epoch: value.object.epochNanoseconds, timeZone: value.object.timeZone };
        }
        const fields = fieldRecord(value.object, options, context, loc);
        if (fields.type === "throw") return fields;
        record = fields.record;
        offset = fields.offset;
    } else {
        if (value.kind !== "string") return languageFailure(context.realm, "TypeError", "ZonedDateTime requires a string or object", loc);
        for (let i = 0; i < value.value.length; i++) {
            const work = context.tick(loc);
            if (work.type === "throw") return work;
        }
        const parsed = parseTemporalZonedDateTime(value.value);
        if (parsed === null) return languageFailure(context.realm, "RangeError", "invalid ZonedDateTime string", loc);
        const settings = conversionOptions(options, context, loc);
        if (settings.type === "throw") return settings;
        record = parsed;
        offset = settings.offset;
    }
    const epoch = interpretTemporalZonedDateTime(record, offset);
    return epoch === null ? languageFailure(context.realm, "RangeError", "invalid ZonedDateTime offset or range", loc) : { type: "normal", epoch, timeZone: record.timeZone };
}

export function registerTemporalZonedConversion(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "from", 1, (_receiver, args, context, loc): ValueCompletion => {
        const value = toTemporalZonedFields(args.length === 0 ? UNDEFINED : args[0], args.length < 2 ? UNDEFINED : args[1], context, loc);
        return value.type === "throw" ? value : createTemporalZonedDateTime(value.epoch, value.timeZone, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
    realm.registerBuiltin(constructor, "compare", 2, (_receiver, args, context, loc): ValueCompletion => {
        const left = toTemporalZonedFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        if (left.type === "throw") return left;
        const right = toTemporalZonedFields(args.length < 2 ? UNDEFINED : args[1], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "number", value: left.epoch < right.epoch ? -1 : left.epoch > right.epoch ? 1 : 0 });
    });
    realm.registerBuiltin(realm.temporalZonedDateTimePrototype, "equals", 1, (receiver, args, context, loc): ValueCompletion => {
        const left = temporalZonedDateTimeObject(receiver, context, loc);
        if (left.type === "throw") return left;
        const right = toTemporalZonedFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "boolean", value: left.value.epochNanoseconds === right.epoch && left.value.timeZone.identifier === right.timeZone.identifier });
    });
}
