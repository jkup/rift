import type { PropertyKey } from "./runtime.js";
import { numberToString, stringToNumber } from "./conversion.js";

// String exotic indices use canonical numeric strings, without Array's ceiling.
export function stringIndex(key: PropertyKey, length: number): number | undefined {
    if (key === "-0") return undefined;
    const index = stringToNumber(key);
    if (numberToString(index) !== key || !Number.isInteger(index) || index < 0 || index >= length) return undefined;
    return index;
}

// Array indices are canonical decimal strings, bounded below 2^32 - 1.
// Parse at most ten digits: no coercion, rounding, or signed bitwise truncation.
export function arrayIndex(key: PropertyKey): number | undefined {
    if (key.length === 0 || key.length > 10) return undefined;
    if (key.length > 1 && key.charAt(0) === "0") return undefined;
    let index = 0;
    for (let i = 0; i < key.length; i++) {
        const digit = key.charCodeAt(i) - 48;
        if (digit < 0 || digit > 9) return undefined;
        index = index * 10 + digit;
    }
    return index <= 4294967294 ? index : undefined;
}
