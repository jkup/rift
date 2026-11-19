import type { Realm } from "../realm.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber, toString, numberToString } from "../conversion.js";
import { stringFromCodeUnit, stringJoin, stringLength } from "../strings.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";

function appendRawPart(
    parts: string[],
    value: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    const text = toString(primitive.value, loc, context.realm);
    if (text.type === "throw") {
        return text;
    }
    for (let i = 0; i < stringLength(text.value); i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
    }
    parts.push(text.value);
    return normal();
}

function rawString(args: Value[], context: OperationContext, loc: Location): ValueCompletion {
    const cooked = toObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (cooked.type === "throw") {
        return cooked;
    }
    const rawValue = cooked.value.internalGet(
        "raw",
        { kind: "object", object: cooked.value },
        context,
        loc,
    );
    if (rawValue.type === "throw") {
        return rawValue;
    }
    const raw = toObject(rawValue.value, context, loc);
    if (raw.type === "throw") {
        return raw;
    }
    const length = lengthOfArrayLike(raw.value, context, loc);
    if (length.type === "throw") {
        return length;
    }
    const parts: string[] = [];
    for (let k = 0; k < length.value; k++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const literal = raw.value.internalGet(
            numberToString(k),
            { kind: "object", object: raw.value },
            context,
            loc,
        );
        if (literal.type === "throw") {
            return literal;
        }
        const added = appendRawPart(parts, literal.value, context, loc);
        if (added.type === "throw") {
            return added;
        }
        if (k + 1 < length.value && k + 1 < args.length) {
            const substitution = appendRawPart(parts, args[k + 1], context, loc);
            if (substitution.type === "throw") {
                return substitution;
            }
        }
    }
    return normal({ kind: "string", value: stringJoin(parts) });
}

function fromCodes(
    args: Value[],
    codePoints: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const parts: string[] = [];
    for (const argument of args) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const primitive = toPrimitive(argument, "number", context, loc);
        if (primitive.type === "throw") {
            return primitive;
        }
        const converted = toNumber(primitive.value, loc, context.realm);
        if (converted.type === "throw") {
            return converted;
        }
        let code = converted.value;
        if (codePoints) {
            if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) {
                return languageFailure(context.realm, "RangeError", "invalid code point", loc);
            }
            if (code > 0xffff) {
                code -= 0x10000;
                parts.push(
                    stringFromCodeUnit(0xd800 + Math.floor(code / 0x400)),
                    stringFromCodeUnit(0xdc00 + (code % 0x400)),
                );
                continue;
            }
        } else {
            code = Number.isFinite(code) ? Math.trunc(code) % 0x10000 : 0;
            if (code < 0) {
                code += 0x10000;
            }
        }
        parts.push(stringFromCodeUnit(code));
    }
    return normal({ kind: "string", value: stringJoin(parts) });
}

export function registerStringConstruction(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(
        constructor,
        "fromCharCode",
        1,
        (_receiver, args, context, loc): ValueCompletion => fromCodes(args, false, context, loc),
    );
    realm.registerBuiltin(
        constructor,
        "fromCodePoint",
        1,
        (_receiver, args, context, loc): ValueCompletion => fromCodes(args, true, context, loc),
    );
    realm.registerBuiltin(constructor, "raw", 1, (_receiver, args, context, loc): ValueCompletion =>
        rawString(args, context, loc),
    );
}
