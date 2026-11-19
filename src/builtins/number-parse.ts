import { stringToNumber, toString, toUint32, type NumberCompletion } from "../conversion.js";
import { toPrimitive } from "../primitive-conversion.js";
import type { Realm } from "../realm.js";
import { normal, UNDEFINED, type GuestObject, type OperationContext, type ValueCompletion } from "../runtime.js";
import { isStringWhitespace } from "../strings.js";
import type { Location } from "../syntax.js";

function digit(code: number): number {
    if (code >= 48 && code <= 57) return code - 48;
    if (code >= 65 && code <= 90) return code - 65 + 10;
    if (code >= 97 && code <= 122) return code - 97 + 10;
    return -1;
}

function scanDigits(text: string, start: number, radix: number, context: OperationContext, loc: Location): NumberCompletion {
    let end = start;
    while (end < text.length) {
        const value = digit(text.charCodeAt(end));
        if (value < 0 || value >= radix) break;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        end++;
    }
    return { type: "normal", value: end };
}

// Only a validated digit span reaches the host binary64 rounding backend.
function integerValue(digits: string, radix: number): number { return parseInt(digits, radix); }

export function registerNumericParsing(realm: Realm, constructor: GuestObject): void {
    for (const name of ["parseInt", "parseFloat"]) {
        const method = realm.registerBuiltin(realm.globalObject, name, name === "parseInt" ? 2 : 1,
            (_receiver, args, context, loc): ValueCompletion => {
                const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
                if (primitive.type === "throw") return primitive;
                const converted = toString(primitive.value, loc, context.realm);
                if (converted.type === "throw") return converted;
                const text = converted.value;
                let start = 0;
                while (start < text.length && isStringWhitespace(text.charCodeAt(start))) {
                    const tick = context.tick(loc);
                    if (tick.type === "throw") return tick;
                    start++;
                }
                const tokenStart = start;
                const negative = text.charAt(start) === "-";
                if (negative || text.charAt(start) === "+") start++;
                if (name === "parseInt") {
                    const radixPrimitive = toPrimitive(args.length < 2 ? UNDEFINED : args[1], "number", context, loc);
                    if (radixPrimitive.type === "throw") return radixPrimitive;
                    const convertedRadix = toUint32(radixPrimitive.value, loc, context.realm);
                    if (convertedRadix.type === "throw") return convertedRadix;
                    let radix = convertedRadix.value;
                    if (radix !== 0 && (radix < 2 || radix > 36)) return normal({ kind: "number", value: NaN });
                    const stripPrefix = radix === 0 || radix === 16;
                    if (radix === 0) radix = 10;
                    if (stripPrefix && text.charAt(start) === "0" && (text.charAt(start + 1) === "x" || text.charAt(start + 1) === "X")) {
                        start += 2;
                        radix = 16;
                    }
                    const end = scanDigits(text, start, radix, context, loc);
                    if (end.type === "throw") return end;
                    const magnitude = end.value === start ? NaN : integerValue(text.slice(start, end.value), radix);
                    return normal({ kind: "number", value: negative ? -magnitude : magnitude });
                }
                if (text.slice(start, start + 8) === "Infinity") return normal({ kind: "number", value: negative ? -Infinity : Infinity });
                const whole = scanDigits(text, start, 10, context, loc);
                if (whole.type === "throw") return whole;
                let end = whole.value;
                let digits = end - start;
                if (text.charAt(end) === ".") {
                    const fraction = scanDigits(text, end + 1, 10, context, loc);
                    if (fraction.type === "throw") return fraction;
                    digits += fraction.value - end - 1;
                    end = fraction.value;
                }
                if (digits === 0) return normal({ kind: "number", value: NaN });
                if (text.charAt(end) === "e" || text.charAt(end) === "E") {
                    let exponentStart = end + 1;
                    if (text.charAt(exponentStart) === "+" || text.charAt(exponentStart) === "-") exponentStart++;
                    const exponent = scanDigits(text, exponentStart, 10, context, loc);
                    if (exponent.type === "throw") return exponent;
                    if (exponent.value > exponentStart) end = exponent.value;
                }
                return normal({ kind: "number", value: stringToNumber(text.slice(tokenStart, end)) });
            });
        constructor.bootstrapDefine(name, { value: method, writable: true, enumerable: false, configurable: true });
    }
}
