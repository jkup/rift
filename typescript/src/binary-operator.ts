import { stringConcat, stringCompare } from "./strings.js";
import { isLooselyEqual } from "./abstract-equality.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber, toString, toPropertyKey } from "./conversion.js";
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
        const a = toNumber(left, loc, context.realm);
        if (a.type === "throw") return a;
        const b = toNumber(right, loc, context.realm);
        if (b.type === "throw") return b;
        return normal({ kind: "number", value: a.value + b.value });
    }
    if (op === "-" || op === "*" || op === "/" || op === "%" || op === "**" ||
        op === "&" || op === "|" || op === "^" || op === "<<" || op === ">>" || op === ">>>") {
        // Both operand evaluations/GetValue have finished. Conversion is
        // left-to-right, so an abrupt RHS evaluation precedes either conversion.
        const leftPrimitive = toPrimitive(left, "number", context, loc);
        if (leftPrimitive.type === "throw") return leftPrimitive;
        const a = toNumber(leftPrimitive.value, loc, context.realm);
        if (a.type === "throw") return a;
        const rightPrimitive = toPrimitive(right, "number", context, loc);
        if (rightPrimitive.type === "throw") return rightPrimitive;
        const b = toNumber(rightPrimitive.value, loc, context.realm);
        if (b.type === "throw") return b;
        switch (op) {
            case "-": return normal({ kind: "number", value: a.value - b.value });
            case "*": return normal({ kind: "number", value: a.value * b.value });
            case "/": return normal({ kind: "number", value: a.value / b.value });
            case "%": return normal({ kind: "number", value: a.value % b.value });
            case "**": return normal({ kind: "number", value: Math.pow(a.value, b.value) });
            case "&": return normal({ kind: "number", value: a.value & b.value });
            case "|": return normal({ kind: "number", value: a.value | b.value });
            case "^": return normal({ kind: "number", value: a.value ^ b.value });
            case "<<": return normal({ kind: "number", value: a.value << b.value });
            case ">>": return normal({ kind: "number", value: a.value >> b.value });
            case ">>>": return normal({ kind: "number", value: a.value >>> b.value });
        }
    }
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
        } else {
            const a = toNumber(left, loc, context.realm);
            if (a.type === "throw") return a;
            const b = toNumber(right, loc, context.realm);
            if (b.type === "throw") return b;
            if (Number.isNaN(a.value) || Number.isNaN(b.value)) order = null;
            else if (a.value < b.value) order = -1;
            else if (a.value > b.value) order = 1;
            else order = 0;
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
