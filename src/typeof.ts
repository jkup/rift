import type { Value } from "./runtime.js";
import type { GuestString } from "./strings.js";

// Classification observes internal callability, never guest-visible properties.
export function typeOfValue(value: Value): GuestString {
    switch (value.kind) {
        case "undefined": return "undefined";
        case "null": return "object";
        case "boolean": return "boolean";
        case "number": return "number";
        case "bigint": return "bigint";
        case "string": return "string";
        case "symbol": return "symbol";
        case "object": return value.object.callable === null ? "object" : "function";
    }
}
