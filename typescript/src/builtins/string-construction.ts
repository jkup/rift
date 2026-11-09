import type { Realm } from "../realm.js";
import { languageFailure, normal, type GuestObject, type OperationContext, type Value, type ValueCompletion } from "../runtime.js";
import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber } from "../conversion.js";
import { stringFromCodeUnit, stringJoin } from "../strings.js";

function fromCodes(args: Value[], codePoints: boolean, context: OperationContext, loc: Location): ValueCompletion {
    const parts: string[] = [];
    for (const argument of args) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const primitive = toPrimitive(argument, "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const converted = toNumber(primitive.value, loc, context.realm);
        if (converted.type === "throw") return converted;
        let code = converted.value;
        if (codePoints) {
            if (!Number.isInteger(code) || code < 0 || code > 0x10ffff)
                return languageFailure(context.realm, "RangeError", "invalid code point", loc);
            if (code > 0xffff) {
                code -= 0x10000;
                parts.push(stringFromCodeUnit(0xd800 + Math.floor(code / 0x400)), stringFromCodeUnit(0xdc00 + code % 0x400));
                continue;
            }
        } else {
            code = Number.isFinite(code) ? Math.trunc(code) % 0x10000 : 0;
            if (code < 0) code += 0x10000;
        }
        parts.push(stringFromCodeUnit(code));
    }
    return normal({ kind: "string", value: stringJoin(parts) });
}

export function registerStringConstruction(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "fromCharCode", 1, (_receiver, args, context, loc): ValueCompletion =>
        fromCodes(args, false, context, loc));
    realm.registerBuiltin(constructor, "fromCodePoint", 1, (_receiver, args, context, loc): ValueCompletion =>
        fromCodes(args, true, context, loc));
}
