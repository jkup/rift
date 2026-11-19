import {
    ianaIdentifiers,
    MAX_IANA_IDENTIFIER_LENGTH,
    type IanaIdentifier,
} from "./iana-timezone-identifiers.js";
import { stringCompare } from "../strings.js";

export function findIanaTimeZoneIdentifier(input: string): IanaIdentifier | null {
    if (input.length === 0 || input.length > MAX_IANA_IDENTIFIER_LENGTH) {
        return null;
    }
    for (let index = 0; index < input.length; index++) {
        if (input.charCodeAt(index) > 127) {
            return null;
        }
    }
    const key = input.toLowerCase();
    let low = 0,
        high = ianaIdentifiers.length;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (stringCompare(ianaIdentifiers[middle].key, key) < 0) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }
    return low < ianaIdentifiers.length && ianaIdentifiers[low].key === key
        ? ianaIdentifiers[low]
        : null;
}
