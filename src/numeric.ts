import { stringToBigInt } from "./bigint-conversion.js";
import { languageFailure } from "./runtime.js";
import type { BigIntResult } from "./bigint-arithmetic.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber } from "./conversion.js";
import type { OperationContext, ThrowCompletion, Value } from "./runtime.js";
import type { Location } from "./syntax.js";

export type NumericValue = { kind: "number"; value: number } | { kind: "bigint"; value: bigint };
export type NumericCompletion = { type: "normal"; value: NumericValue } | ThrowCompletion;

export function toNumeric(
    value: Value,
    context: OperationContext,
    loc: Location,
): NumericCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    if (primitive.value.kind === "bigint") {
        return { type: "normal", value: primitive.value };
    }
    const number = toNumber(primitive.value, loc, context.realm);
    return number.type === "throw"
        ? number
        : { type: "normal", value: { kind: "number", value: number.value } };
}

function compareBigIntNumber(left: bigint, right: number): number | null {
    if (Number.isNaN(right)) {
        return null;
    }
    if (right === Infinity) {
        return -1;
    }
    if (right === -Infinity) {
        return 1;
    }
    const truncated = Math.trunc(right),
        integer = BigInt(truncated);
    if (left < integer) {
        return -1;
    }
    if (left > integer) {
        return 1;
    }
    return right === truncated ? 0 : right > truncated ? -1 : 1;
}

export function compareNumeric(left: NumericValue, right: NumericValue): number | null {
    if (left.kind === "bigint" && right.kind === "number") {
        return compareBigIntNumber(left.value, right.value);
    }
    if (left.kind === "number" && right.kind === "bigint") {
        const order = compareBigIntNumber(right.value, left.value);
        return order === null ? null : -order;
    }
    if (left.kind === "bigint" && right.kind === "bigint") {
        return left.value < right.value ? -1 : left.value > right.value ? 1 : 0;
    }
    if (left.kind !== "number" || right.kind !== "number") {
        throw new Error("numeric comparison kind invariant");
    }
    if (Number.isNaN(left.value) || Number.isNaN(right.value)) {
        return null;
    }
    return left.value < right.value ? -1 : left.value > right.value ? 1 : 0;
}

export function toBigInt(value: Value, context: OperationContext, loc: Location): BigIntResult {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    value = primitive.value;
    if (value.kind === "bigint") {
        return { type: "normal", value: value.value };
    }
    if (value.kind === "boolean") {
        return { type: "normal", value: value.value ? 1n : 0n };
    }
    if (value.kind === "string") {
        const parsed = stringToBigInt(value.value, context, loc);
        if (parsed.type === "throw") {
            return parsed;
        }
        if (parsed.value === null) {
            return languageFailure(context.realm, "SyntaxError", "invalid BigInt string", loc);
        }
        return { type: "normal", value: parsed.value };
    }
    return languageFailure(context.realm, "TypeError", "value cannot be converted to BigInt", loc);
}
