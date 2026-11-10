import { languageFailure, type OperationContext, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export type BigIntOperator = "+" | "-" | "*" | "/" | "%" | "**" | "&" | "|" | "^" | "<<" | ">>" | ">>>";
export type BigIntResult = { type: "normal"; value: bigint } | ThrowCompletion;

function width(value: bigint): bigint { return BigInt((value < 0n ? -value : value).toString(2).length); }

function charge(units: bigint, context: OperationContext, loc: Location): ThrowCompletion | null {
    for (let i = 0n; i < units; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
    }
    return null;
}

export function bigintOperation(op: BigIntOperator, left: bigint, right: bigint, context: OperationContext, loc: Location): BigIntResult {
    if ((op === "/" || op === "%") && right === 0n)
        return languageFailure(context.realm, "RangeError", "BigInt division by zero", loc);
    if (op === "**" && right < 0n)
        return languageFailure(context.realm, "RangeError", "negative BigInt exponent", loc);
    if (op === ">>>") return languageFailure(context.realm, "TypeError", "BigInt unsigned right shift is not defined", loc);
    if (op === "**") {
        if (right === 0n) return { type: "normal", value: 1n };
        if (left === 0n || left === 1n) return { type: "normal", value: left };
        if (left === -1n) return { type: "normal", value: right % 2n === 0n ? 1n : -1n };
        // Charge the result's upper-bound width before asking the host to allocate it.
        const stopped = charge(width(left) * right, context, loc);
        if (stopped !== null) return stopped;
        return { type: "normal", value: left ** right };
    }
    if (op === "<<" || op === ">>") {
        const shift = op === "<<" ? right : -right;
        if (left === 0n) return { type: "normal", value: 0n };
        const bits = width(left);
        if (shift < 0n && -shift >= bits) return { type: "normal", value: left < 0n ? -1n : 0n };
        const stopped = charge(bits + (shift > 0n ? shift : 0n), context, loc);
        if (stopped !== null) return stopped;
        return { type: "normal", value: left << shift };
    }
    const leftWidth = width(left), rightWidth = width(right);
    const work = op === "*" || op === "/" || op === "%" ? leftWidth * rightWidth : leftWidth + rightWidth;
    const stopped = charge(work, context, loc);
    if (stopped !== null) return stopped;
    switch (op) {
        case "+": return { type: "normal", value: left + right };
        case "-": return { type: "normal", value: left - right };
        case "*": return { type: "normal", value: left * right };
        case "/": return { type: "normal", value: left / right };
        case "%": return { type: "normal", value: left % right };
        case "&": return { type: "normal", value: left & right };
        case "|": return { type: "normal", value: left | right };
        case "^": return { type: "normal", value: left ^ right };
    }
}
