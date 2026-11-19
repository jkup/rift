import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber, type NumberCompletion } from "../conversion.js";
import { languageFailure, type Value, type OperationContext } from "../runtime.js";

export function temporalInteger(
    value: Value,
    context: OperationContext,
    loc: Location,
): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    const converted = toNumber(primitive.value, loc, context.realm);
    if (converted.type === "throw") {
        return converted;
    }
    if (!Number.isFinite(converted.value)) {
        return languageFailure(context.realm, "RangeError", "Temporal field must be finite", loc);
    }
    const integer = Math.trunc(converted.value);
    return { type: "normal", value: integer === 0 ? 0 : integer };
}
