import type { Realm } from "../realm.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toIntegerOrInfinity, toString } from "../conversion.js";
import { stringEndsWith, stringIndexOf, stringLength, stringStartsWith } from "../strings.js";
import { isRegExp } from "../regexp/regexp-object.js";
import { stringReceiver } from "./string.js";

export function registerStringSearch(realm: Realm): void {
    for (const name of ["includes", "startsWith", "endsWith"] as const) {
        realm.registerBuiltin(
            realm.stringPrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const text = stringReceiver(receiver, context, loc);
                if (text.type === "throw") {
                    return text;
                }
                const search = args.length === 0 ? UNDEFINED : args[0];
                const regexp = isRegExp(search, context, loc);
                if (regexp.type === "throw") {
                    return regexp;
                }
                if (regexp.value) {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "search value must not be a RegExp",
                        loc,
                    );
                }
                const primitive = toPrimitive(search, "string", context, loc);
                if (primitive.type === "throw") {
                    return primitive;
                }
                const needle = toString(primitive.value, loc, context.realm);
                if (needle.type === "throw") {
                    return needle;
                }
                const length = stringLength(text.value);
                let position = name === "endsWith" ? length : 0;
                if (args.length > 1 && args[1].kind !== "undefined") {
                    const numeric = toPrimitive(args[1], "number", context, loc);
                    if (numeric.type === "throw") {
                        return numeric;
                    }
                    const integer = toIntegerOrInfinity(numeric.value, loc, context.realm);
                    if (integer.type === "throw") {
                        return integer;
                    }
                    position = Math.min(Math.max(integer.value, 0), length);
                }
                let found: boolean;
                if (name === "includes") {
                    found = stringIndexOf(text.value, needle.value, position) >= 0;
                } else if (name === "startsWith") {
                    found = stringStartsWith(text.value, needle.value, position);
                } else {
                    found = stringEndsWith(text.value, needle.value, position);
                }
                return normal({ kind: "boolean", value: found });
            },
        );
    }
}
