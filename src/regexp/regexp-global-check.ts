import { isRegExp } from "./regexp-object.js";
import { regExpString } from "../builtins/regexp/regexp.js";
import {
    normal,
    languageFailure,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../runtime.js";
import type { Location } from "../syntax.js";

export function requireGlobalRegExp(
    value: Value,
    method: string,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const regexp = isRegExp(value, context, loc);
    if (regexp.type === "throw") {
        return regexp;
    }
    if (!regexp.value) {
        return normal();
    }
    if (value.kind !== "object") {
        throw new Error("IsRegExp object invariant");
    }
    const property = value.object.internalGet("flags", value, context, loc);
    if (property.type === "throw") {
        return property;
    }
    if (property.value.kind === "undefined" || property.value.kind === "null") {
        return languageFailure(context.realm, "TypeError", method + " flags are nullish", loc);
    }
    const flags = regExpString(property.value, context, loc);
    if (flags.type === "throw") {
        return flags;
    }
    return flags.value.includes("g")
        ? normal()
        : languageFailure(
              context.realm,
              "TypeError",
              "String " + method + " requires a global RegExp",
              loc,
          );
}
