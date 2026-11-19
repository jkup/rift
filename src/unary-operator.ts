import { toNumeric } from "./numeric.js";
import { normal, truthy, type Value, type ValueCompletion, type OperationContext } from "./runtime.js";
import { typeOfValue } from "./typeof.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber } from "./conversion.js";
import type { Location } from "./syntax.js";

// Reference-specific typeof/delete handling belongs to the evaluator.
export function applyUnaryValueOperator(op: string, value: Value, context: OperationContext, loc: Location): ValueCompletion {
    if (op === "typeof") return normal({ kind: "string", value: typeOfValue(value) });
    if (op === "void") return normal();
    if (op === "!") return normal({ kind: "boolean", value: !truthy(value) });
    if (op === "delete") return normal({ kind: "boolean", value: true });
    if (op === "+") {
        const primitive = toPrimitive(value, "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const number = toNumber(primitive.value, loc, context.realm);
        return number.type === "throw" ? number : normal({ kind: "number", value: number.value });
    }
    const numeric = toNumeric(value, context, loc);
    if (numeric.type === "throw") return numeric;
    if (numeric.value.kind === "bigint") return normal({ kind: "bigint", value: op === "~" ? ~numeric.value.value : -numeric.value.value });
    return normal({ kind: "number", value: op === "~" ? ~numeric.value.value : -numeric.value.value });
}
