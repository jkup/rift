import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import { normal, UNDEFINED, type OperationContext, type ValueCompletion } from "../runtime.js";
import { stringCodeUnit, stringFromCodeUnit, stringJoin, stringUnit, type GuestString } from "../strings.js";

function escapeUnits(text: GuestString, context: OperationContext, loc: Location): ValueCompletion {
    const parts: GuestString[] = [], hex = "0123456789ABCDEF";
    for (let index = 0; index < text.length; index++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const unit = stringUnit(text, index), code = stringCodeUnit(text, index);
        if ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./".includes(unit)) parts.push(unit);
        else if (code < 256) parts.push("%" + stringUnit(hex, code >> 4) + stringUnit(hex, code & 15));
        else parts.push("%u" + stringUnit(hex, code >> 12) + stringUnit(hex, (code >> 8) & 15)
            + stringUnit(hex, (code >> 4) & 15) + stringUnit(hex, code & 15));
    }
    return normal({ kind: "string", value: stringJoin(parts) });
}

function hexadecimal(text: GuestString, start: number, count: number): number {
    let value = 0;
    for (let index = start; index < start + count; index++) {
        const code = stringCodeUnit(text, index);
        const digit = code >= 48 && code <= 57 ? code - 48
            : code >= 65 && code <= 70 ? code - 55 : code >= 97 && code <= 102 ? code - 87 : -1;
        if (digit < 0) return -1;
        value = value * 16 + digit;
    }
    return value;
}

function unescapeUnits(text: GuestString, context: OperationContext, loc: Location): ValueCompletion {
    const parts: GuestString[] = [];
    for (let index = 0; index < text.length; index++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        let code = -1, width = 0;
        if (stringUnit(text, index) === "%") {
            if (index + 5 < text.length && stringUnit(text, index + 1) === "u") {
                code = hexadecimal(text, index + 2, 4);
                width = 6;
            } else if (index + 2 < text.length) {
                code = hexadecimal(text, index + 1, 2);
                width = 3;
            }
        }
        if (code < 0) parts.push(stringUnit(text, index));
        else {
            parts.push(stringFromCodeUnit(code));
            index += width - 1;
        }
    }
    return normal({ kind: "string", value: stringJoin(parts) });
}

export function registerLegacyEscape(realm: Realm): void {
    for (const name of ["escape", "unescape"]) {
        realm.registerBuiltin(realm.globalObject, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
            if (primitive.type === "throw") return primitive;
            const text = toString(primitive.value, loc, context.realm);
            if (text.type === "throw") return text;
            return name === "escape" ? escapeUnits(text.value, context, loc) : unescapeUnits(text.value, context, loc);
        });
    }
}
