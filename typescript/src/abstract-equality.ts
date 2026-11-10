import { stringToBigInt } from "./bigint-conversion.js";
import { equal, type Value, type OperationContext, type InternalBooleanCompletion } from "./runtime.js";
import { stringToNumber } from "./conversion.js";
import { toPrimitive } from "./primitive-conversion.js";
import type { Location } from "./syntax.js";

export function isLooselyEqual(
    x: Value, y: Value, context: OperationContext, loc: Location,
): InternalBooleanCompletion {
    let left = x;
    let right = y;
    // Every continuation decreases the sum of weights: object=3, boolean=2,
    // string=1, others=0. ToPrimitive never normally returns an object.
    // Same-kind objects exit before conversion, so at most one is converted.
    while (true) {
        if (left.kind === right.kind) return { type: "normal", value: equal(left, right) };
        if ((left.kind === "null" && right.kind === "undefined")
            || (left.kind === "undefined" && right.kind === "null")) return { type: "normal", value: true };
        if (left.kind === "number" && right.kind === "string") {
            right = { kind: "number", value: stringToNumber(right.value) };
            continue;
        }
        if (left.kind === "string" && right.kind === "number") {
            left = { kind: "number", value: stringToNumber(left.value) };
            continue;
        }
        if (left.kind === "bigint" && right.kind === "string") {
            const parsed = stringToBigInt(right.value, context, loc);
            if (parsed.type === "throw") return parsed;
            return { type: "normal", value: parsed.value !== null && left.value === parsed.value };
        }
        if (left.kind === "string" && right.kind === "bigint") {
            const parsed = stringToBigInt(left.value, context, loc);
            if (parsed.type === "throw") return parsed;
            return { type: "normal", value: parsed.value !== null && parsed.value === right.value };
        }
        if (left.kind === "bigint" && right.kind === "number")
            return { type: "normal", value: Number.isInteger(right.value) && left.value === BigInt(right.value) };
        if (left.kind === "number" && right.kind === "bigint")
            return { type: "normal", value: Number.isInteger(left.value) && BigInt(left.value) === right.value };
        if (left.kind === "boolean") {
            left = { kind: "number", value: left.value ? 1 : 0 };
            continue;
        }
        if (right.kind === "boolean") {
            right = { kind: "number", value: right.value ? 1 : 0 };
            continue;
        }
        if ((left.kind === "string" || left.kind === "number" || left.kind === "bigint" || left.kind === "symbol") && right.kind === "object") {
            const primitive = toPrimitive(right, "default", context, loc);
            if (primitive.type === "throw") return primitive;
            right = primitive.value;
            continue;
        }
        if (left.kind === "object" && (right.kind === "string" || right.kind === "number" || right.kind === "bigint" || right.kind === "symbol")) {
            const primitive = toPrimitive(left, "default", context, loc);
            if (primitive.type === "throw") return primitive;
            left = primitive.value;
            continue;
        }
        return { type: "normal", value: false };
    }
}
