import { isStringWhitespace } from "./strings.js";
import type { ThrowCompletion, ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export type BigIntParseResult = { type: "normal"; value: bigint | null } | ThrowCompletion;

export function stringToBigInt(text: string, context: { tick: (loc: Location) => ValueCompletion }, loc: Location): BigIntParseResult {
    let start = 0, end = text.length;
    while (start < end && isStringWhitespace(text.charCodeAt(start))) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        start++;
    }
    while (end > start && isStringWhitespace(text.charCodeAt(end - 1))) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        end--;
    }
    if (start === end) return { type: "normal", value: 0n };
    let negative = false, signed = false, radix = 10;
    if (text.charAt(start) === "+" || text.charAt(start) === "-") {
        signed = true;
        negative = text.charAt(start++) === "-";
    }
    if (!signed && text.charAt(start) === "0") {
        const prefix = text.charAt(start + 1);
        if (prefix === "x" || prefix === "X") radix = 16;
        else if (prefix === "o" || prefix === "O") radix = 8;
        else if (prefix === "b" || prefix === "B") radix = 2;
        if (radix !== 10) start += 2;
    }
    if (start === end) return { type: "normal", value: null };
    const base = BigInt(radix);
    let value = 0n;
    for (let i = start; i < end; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const code = text.charCodeAt(i);
        const digit = code >= 48 && code <= 57 ? code - 48
            : code >= 65 && code <= 70 ? code - 55 : code >= 97 && code <= 102 ? code - 87 : -1;
        if (digit < 0 || digit >= radix) return { type: "normal", value: null };
        value = value * base + BigInt(digit);
    }
    return { type: "normal", value: negative ? -value : value };
}

export function bigintToString(value: bigint, radix: number): string {
    if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new Error("validated BigInt radix required");
    return value.toString(radix);
}
