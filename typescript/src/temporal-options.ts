import { toPrimitive } from "./primitive-conversion.js";
import { toString, type StringCompletion } from "./conversion.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import { languageFailure, type GuestObject, type OperationContext, type ThrowCompletion, type Value } from "./runtime.js";
import type { Location } from "./syntax.js";

export function temporalOptionString(value: Value, context: OperationContext, loc: Location): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    return primitive.type === "throw" ? primitive : toString(primitive.value, loc, context.realm);
}

export function temporalRoundingMode(options: GuestObject, context: OperationContext, loc: Location, fallback: TemporalRoundingMode): { type: "normal"; value: TemporalRoundingMode } | ThrowCompletion {
    const read = options.internalGet("roundingMode", { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: fallback };
    const converted = temporalOptionString(read.value, context, loc);
    if (converted.type === "throw") return converted;
    const mode = converted.value;
    if (mode === "ceil" || mode === "floor" || mode === "expand" || mode === "trunc" || mode === "halfCeil" ||
        mode === "halfFloor" || mode === "halfExpand" || mode === "halfTrunc" || mode === "halfEven") return { type: "normal", value: mode };
    return languageFailure(context.realm, "RangeError", "invalid rounding mode", loc);
}
