import type { GuestString } from "./strings.js";
import { formatRadix, RadixResources } from "./number-radix-internal.js";

// Caller owns signs, special values, coercion and the unchanged decimal path.
export function numberToStringRadix(value: number, radix: number): GuestString {
    return formatRadix(value, radix, new RadixResources());
}
