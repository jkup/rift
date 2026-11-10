import { GuestTemporalPlainDateTime } from "../temporal-plain-date-time-object.js";
import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import type { TimeFields } from "../temporal-time.js";
import { GuestTemporalPlainTime, createTemporalPlainTime, temporalPlainTimeValue } from "../temporal-plain-time-object.js";
import { readTemporalTimeFields, regulateTemporalTime } from "../temporal-time-fields.js";
import { parseTemporalPlainTime } from "../temporal-plain-time-parse.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type Value, type OperationContext, type ThrowCompletion, type ValueCompletion } from "../runtime.js";

export function toTimeFields(value: Value, options: Value, context: OperationContext, loc: Location): { type: "normal"; value: TimeFields } | ThrowCompletion {
    let fields: TimeFields;
    if (value.kind === "object") {
        if (value.object instanceof GuestTemporalPlainDateTime) fields = value.object.dateTime;
        else if (value.object instanceof GuestTemporalPlainTime) fields = value.object.time;
        else {
            const read = readTemporalTimeFields(value.object, { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 }, context, loc);
            if (read.type === "throw") return read;
            fields = read.value;
        }
    } else if (value.kind === "string") {
        for (let i = 0; i < value.value.length; i++) {
            const work = context.tick(loc);
            if (work.type === "throw") return work;
        }
        const parsed = parseTemporalPlainTime(value.value);
        if (parsed === null) return languageFailure(context.realm, "RangeError", "invalid PlainTime string", loc);
        fields = parsed;
    } else return languageFailure(context.realm, "TypeError", "PlainTime requires a string or time object", loc);
    return regulateTemporalTime(fields, options, context, loc);
}

function compareTime(left: TimeFields, right: TimeFields): number {
    const names: (keyof TimeFields)[] = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"];
    for (const name of names) {
        if (left[name] < right[name]) return -1;
        if (left[name] > right[name]) return 1;
    }
    return 0;
}

export function registerTemporalPlainTimeConversion(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "from", 1, (_receiver, args, context, loc): ValueCompletion => {
        const result = toTimeFields(args.length === 0 ? UNDEFINED : args[0], args.length < 2 ? UNDEFINED : args[1], context, loc);
        return result.type === "throw" ? result : createTemporalPlainTime(result.value, context.realm.temporalPlainTimePrototype, context, loc);
    });
    realm.registerBuiltin(constructor, "compare", 2, (_receiver, args, context, loc): ValueCompletion => {
        const left = toTimeFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        if (left.type === "throw") return left;
        const right = toTimeFields(args.length < 2 ? UNDEFINED : args[1], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "number", value: compareTime(left.value, right.value) });
    });
    realm.registerBuiltin(realm.temporalPlainTimePrototype, "equals", 1, (receiver, args, context, loc): ValueCompletion => {
        const left = temporalPlainTimeValue(receiver, context, loc);
        if (left.type === "throw") return left;
        const right = toTimeFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "boolean", value: compareTime(left.value, right.value) === 0 });
    });
}
