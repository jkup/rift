import { GuestTemporalZonedDateTime } from "../../temporal/temporal-zoned-date-time-object.js";
import { compareBigInts } from "../../numeric.js";
import type { Realm } from "../../realm.js";
import type { BigIntResult } from "../../bigint-arithmetic.js";
import type { Location } from "../../syntax.js";
import {
    GuestTemporalInstant,
    createTemporalInstant,
    temporalInstantValue,
} from "../../temporal/temporal-instant-object.js";
import { parseTemporalInstant } from "../../temporal/temporal-instant-parse.js";
import { toPrimitive } from "../../primitive-conversion.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../../runtime.js";

export function toInstantNanoseconds(
    value: Value,
    context: OperationContext,
    loc: Location,
): BigIntResult {
    if (value.kind === "object" && value.object instanceof GuestTemporalInstant) {
        return { type: "normal", value: value.object.epochNanoseconds };
    }
    if (value.kind === "object" && value.object instanceof GuestTemporalZonedDateTime) {
        return { type: "normal", value: value.object.epochNanoseconds };
    }
    const primitive = toPrimitive(value, "string", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    if (primitive.value.kind !== "string") {
        return languageFailure(
            context.realm,
            "TypeError",
            "Instant requires a string or Instant",
            loc,
        );
    }
    const text = primitive.value.value;
    for (let i = 0; i < text.length; i++) {
        const work = context.tick(loc);
        if (work.type === "throw") {
            return work;
        }
    }
    const parsed = parseTemporalInstant(text);
    return parsed === null
        ? languageFailure(context.realm, "RangeError", "invalid Instant string", loc)
        : { type: "normal", value: parsed };
}

export function registerTemporalInstantConversion(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(
        constructor,
        "from",
        1,
        (_receiver, args, context, loc): ValueCompletion => {
            const value = toInstantNanoseconds(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            return value.type === "throw"
                ? value
                : createTemporalInstant(
                      value.value,
                      context.realm.temporalInstantPrototype,
                      context,
                      loc,
                  );
        },
    );
    realm.registerBuiltin(
        constructor,
        "compare",
        2,
        (_receiver, args, context, loc): ValueCompletion => {
            const left = toInstantNanoseconds(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            if (left.type === "throw") {
                return left;
            }
            const right = toInstantNanoseconds(args.length < 2 ? UNDEFINED : args[1], context, loc);
            if (right.type === "throw") {
                return right;
            }
            return normal({
                kind: "number",
                value: compareBigInts(left.value, right.value),
            });
        },
    );
    realm.registerBuiltin(
        realm.temporalInstantPrototype,
        "equals",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const left = temporalInstantValue(receiver, context, loc);
            if (left.type === "throw") {
                return left;
            }
            const right = toInstantNanoseconds(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            return right.type === "throw"
                ? right
                : normal({ kind: "boolean", value: left.value === right.value });
        },
    );
}
