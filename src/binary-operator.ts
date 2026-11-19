import { bigintOperation, type BigIntOperator } from "./bigint-arithmetic.js";
import { toNumeric, compareNumeric } from "./numeric.js";
import { stringToBigInt } from "./bigint-conversion.js";
import { stringConcat, stringCompare } from "./strings.js";
import { isLooselyEqual } from "./abstract-equality.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toString, toPropertyKey } from "./conversion.js";
import { normal, equal, truthy, languageFailure, type Value, type ValueCompletion, type OperationContext } from "./runtime.js";
import type { Location } from "./syntax.js";

export function skipsRightOperand(op: string, left: Value): boolean {
    return (op === "&&" && !truthy(left)) || (op === "||" && truthy(left)) ||
        (op === "??" && left.kind !== "null" && left.kind !== "undefined");
}

export function applyBinaryOperator(op: string, left: Value, right: Value, context: OperationContext, loc: Location): ValueCompletion {
    if (op === "in") {
        // Both operands are captured; reject a primitive RHS before key hooks.
        if (right.kind !== "object") {
            return languageFailure(context.realm, "TypeError", "right operand of in must be an object", loc);
        }
        const key = toPropertyKey(left, context, loc);
        if (key.type === "throw") {
            return key;
        }
        const present = right.object.internalHasProperty(key.value, loc);
        if (present.type === "throw") {
            return present;
        }
        return normal({ kind: "boolean", value: present.value });
    }
    if (op === "+") {
        // Convert both captured Values before selecting concatenation.
        const leftPrimitive = toPrimitive(left, "default", context, loc);
        if (leftPrimitive.type === "throw") return leftPrimitive;
        const rightPrimitive = toPrimitive(right, "default", context, loc);
        if (rightPrimitive.type === "throw") return rightPrimitive;
        left = leftPrimitive.value;
        right = rightPrimitive.value;
        if (left.kind === "string" || right.kind === "string") {
            const a = toString(left, loc, context.realm);
            if (a.type === "throw") return a;
            const b = toString(right, loc, context.realm);
            if (b.type === "throw") return b;
            return normal({ kind: "string", value: stringConcat(a.value, b.value) });
        }
        return numericBinary("+", left, right, context, loc);
    }
    if (op === "-" || op === "*" || op === "/" || op === "%" || op === "**" ||
        op === "&" || op === "|" || op === "^" || op === "<<" || op === ">>" || op === ">>>")
        return numericBinary(op, left, right, context, loc);
    if (op === "==" || op === "!=") {
        // Values were captured in source order; fixed 2025 13.11.1 reverses
        // helper arguments, without reevaluating either operand.
        const result = isLooselyEqual(right, left, context, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "boolean", value: op === "!=" ? !result.value : result.value });
    }
    if (op === "===" || op === "!==") return normal({ kind: "boolean", value: op === "===" ? equal(left, right) : !equal(left, right) });
    if (op === "<" || op === ">" || op === "<=" || op === ">=") {
        const leftPrimitive = toPrimitive(left, "number", context, loc);
        if (leftPrimitive.type === "throw") return leftPrimitive;
        const rightPrimitive = toPrimitive(right, "number", context, loc);
        if (rightPrimitive.type === "throw") return rightPrimitive;
        left = leftPrimitive.value;
        right = rightPrimitive.value;
        // Keep source order even for > and <=. Once both values are primitive,
        // numeric conversion has no guest effects; reverse only the relation.
        let order: number | null;
        if (left.kind === "string" && right.kind === "string") {
            order = stringCompare(left.value, right.value);
        } else if (left.kind === "bigint" && right.kind === "string") {
            const parsed = stringToBigInt(right.value, context, loc);
            if (parsed.type === "throw") return parsed;
            order = parsed.value === null ? null : compareNumeric(left, { kind: "bigint", value: parsed.value });
        } else if (left.kind === "string" && right.kind === "bigint") {
            const parsed = stringToBigInt(left.value, context, loc);
            if (parsed.type === "throw") return parsed;
            order = parsed.value === null ? null : compareNumeric({ kind: "bigint", value: parsed.value }, right);
        } else {
            const a = toNumeric(left, context, loc);
            if (a.type === "throw") return a;
            const b = toNumeric(right, context, loc);
            if (b.type === "throw") return b;
            order = compareNumeric(a.value, b.value);
        }
        // Unordered is distinct from equal: every NaN comparison is false.
        if (order === null) return normal({ kind: "boolean", value: false });
        switch (op) {
            case "<": return normal({ kind: "boolean", value: order < 0 });
            case ">": return normal({ kind: "boolean", value: order > 0 });
            case "<=": return normal({ kind: "boolean", value: order <= 0 });
            case ">=": return normal({ kind: "boolean", value: order >= 0 });
        }
    }
    throw new Error("unknown binary operator: " + op);
}

function numericBinary(op: BigIntOperator, left: Value, right: Value, context: OperationContext, loc: Location): ValueCompletion {
    const a = toNumeric(left, context, loc);
    if (a.type === "throw") return a;
    const b = toNumeric(right, context, loc);
    if (b.type === "throw") return b;
    if (a.value.kind === "bigint" && b.value.kind === "bigint") {
        const result = bigintOperation(op, a.value.value, b.value.value, context, loc);
        return result.type === "throw" ? result : normal({ kind: "bigint", value: result.value });
    }
    if (a.value.kind !== "number" || b.value.kind !== "number")
        return languageFailure(context.realm, "TypeError", "cannot mix BigInt and other numeric types", loc);
    const x = a.value.value, y = b.value.value;
    switch (op) {
        case "+": return normal({ kind: "number", value: x + y });
        case "-": return normal({ kind: "number", value: x - y });
        case "*": return normal({ kind: "number", value: x * y });
        case "/": return normal({ kind: "number", value: x / y });
        case "%": return normal({ kind: "number", value: x % y });
        case "**": return normal({ kind: "number", value: Math.pow(x, y) });
        case "&": return normal({ kind: "number", value: x & y });
        case "|": return normal({ kind: "number", value: x | y });
        case "^": return normal({ kind: "number", value: x ^ y });
        case "<<": return normal({ kind: "number", value: x << y });
        case ">>": return normal({ kind: "number", value: x >> y });
        case ">>>": return normal({ kind: "number", value: x >>> y });
    }
}
