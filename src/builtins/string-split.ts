import type { Realm } from "../realm.js";
import type { GuestArray } from "../array-object.js";
import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { numberToString, toString, toUint32 } from "../conversion.js";
import {
    stringIndexOf,
    stringLength,
    stringSlice,
    stringUnit,
    type GuestString,
} from "../strings.js";
import { wellKnownSplit } from "../symbols.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type ValueCompletion,
} from "../runtime.js";

function append(
    result: GuestArray,
    index: number,
    text: GuestString,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") {
        return tick;
    }
    const defined = result.defineOwnProperty(
        numberToString(index),
        {
            value: { kind: "string", value: text },
            writable: true,
            enumerable: true,
            configurable: true,
        },
        context,
        loc,
    );
    if (defined.type === "throw") {
        return defined;
    }
    if (!defined.value) {
        throw new Error("fresh split array element invariant");
    }
    return normal();
}

export function registerStringSplit(realm: Realm): void {
    realm.registerBuiltin(
        realm.stringPrototype,
        "split",
        2,
        (receiver, args, context, loc): ValueCompletion => {
            if (receiver.kind === "null" || receiver.kind === "undefined") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "cannot convert null or undefined to object",
                    loc,
                );
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const separator = args.length === 0 ? UNDEFINED : args[0];
            const limit = args.length < 2 ? UNDEFINED : args[1];
            if (separator.kind === "object") {
                const object = separator.object;
                const method = object.internalGet(wellKnownSplit, separator, context, loc);
                if (method.type === "throw") {
                    return method;
                }
                if (method.value.kind !== "undefined" && method.value.kind !== "null") {
                    if (method.value.kind !== "object" || method.value.object.callable === null) {
                        return languageFailure(
                            context.realm,
                            "TypeError",
                            "split method is not callable",
                            loc,
                        );
                    }
                    return context.call(method.value, separator, [receiver, limit], loc);
                }
            }
            const primitive = toPrimitive(receiver, "string", context, loc);
            if (primitive.type === "throw") {
                return primitive;
            }
            const text = toString(primitive.value, loc, context.realm);
            if (text.type === "throw") {
                return text;
            }
            let count = 4294967295;
            if (limit.kind !== "undefined") {
                const primitiveLimit = toPrimitive(limit, "number", context, loc);
                if (primitiveLimit.type === "throw") {
                    return primitiveLimit;
                }
                const converted = toUint32(primitiveLimit.value, loc, context.realm);
                if (converted.type === "throw") {
                    return converted;
                }
                count = converted.value;
            }
            const primitiveSeparator = toPrimitive(separator, "string", context, loc);
            if (primitiveSeparator.type === "throw") {
                return primitiveSeparator;
            }
            const search = toString(primitiveSeparator.value, loc, context.realm);
            if (search.type === "throw") {
                return search;
            }
            const result = context.realm.createArray();
            if (count === 0) {
                return normal({ kind: "object", object: result });
            }
            if (separator.kind === "undefined") {
                const added = append(result, 0, text.value, context, loc);
                return added.type === "throw" ? added : normal({ kind: "object", object: result });
            }
            const length = stringLength(text.value);
            const separatorLength = stringLength(search.value);
            if (separatorLength === 0) {
                const end = Math.min(count, length);
                for (let index = 0; index < end; index++) {
                    const added = append(
                        result,
                        index,
                        stringUnit(text.value, index),
                        context,
                        loc,
                    );
                    if (added.type === "throw") {
                        return added;
                    }
                }
            } else {
                let start = 0;
                for (let index = 0; index < count; index++) {
                    const match = stringIndexOf(text.value, search.value, start);
                    const added = append(
                        result,
                        index,
                        stringSlice(text.value, start, match < 0 ? length : match),
                        context,
                        loc,
                    );
                    if (added.type === "throw") {
                        return added;
                    }
                    if (match < 0) {
                        break;
                    }
                    start = match + separatorLength;
                }
            }
            return normal({ kind: "object", object: result });
        },
    );
}
