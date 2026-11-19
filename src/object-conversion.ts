import {
    languageFailure,
    type GuestObject,
    type OperationContext,
    type ThrowCompletion,
    type Value,
} from "./runtime.js";
import type { Location } from "./syntax.js";

export type ObjectCompletion = { type: "normal"; value: GuestObject } | ThrowCompletion;

// Boxing for explicit conversion and property reads/assignments; no ticks or conversion hooks.
export function toObject(input: Value, context: OperationContext, loc: Location): ObjectCompletion {
    switch (input.kind) {
        case "object":
            return { type: "normal", value: input.object };
        case "boolean":
            return { type: "normal", value: context.realm.createBooleanObject(input.value) };
        case "number":
            return { type: "normal", value: context.realm.createNumberObject(input.value) };
        case "bigint":
            return { type: "normal", value: context.realm.createBigIntObject(input.value) };
        case "symbol":
            return { type: "normal", value: context.realm.createSymbolObject(input.value) };
        case "string":
            return { type: "normal", value: context.realm.createStringObject(input.value) };
        case "null":
        case "undefined":
            return languageFailure(
                context.realm,
                "TypeError",
                "cannot convert null or undefined to object",
                loc,
            );
    }
}
