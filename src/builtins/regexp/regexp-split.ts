import type { Realm } from "../../realm.js";
import {
    normal,
    languageFailure,
    UNDEFINED,
    type GuestObject,
    type Value,
    type ValueCompletion,
    type OperationContext,
} from "../../runtime.js";
import type { GuestArray } from "../../array-object.js";
import { toPrimitive } from "../../primitive-conversion.js";
import { numberToString, toLength, toUint32 } from "../../conversion.js";
import { lengthOfArrayLike } from "../../array-like.js";
import { wellKnownSplit } from "../../symbols.js";
import { regExpSpecies } from "../../regexp/regexp-species.js";
import { regExpString } from "./regexp.js";
import { regExpExec } from "./regexp-execution.js";
import { advanceStringIndex } from "./regexp-match-search.js";
import type { Location } from "../../syntax.js";

function append(
    array: GuestArray,
    index: number,
    value: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") {
        return tick;
    }
    const added = array.defineOwnProperty(
        numberToString(index),
        { value, writable: true, enumerable: true, configurable: true },
        context,
        loc,
    );
    if (added.type === "throw") {
        return added;
    }
    if (!added.value) {
        throw new Error("fresh split array definition failed");
    }
    return normal();
}

function split(
    receiver: Value,
    args: Value[],
    defaultConstructor: GuestObject,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (receiver.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "RegExp split receiver is not an object",
            loc,
        );
    }
    const input = regExpString(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (input.type === "throw") {
        return input;
    }
    const constructor = regExpSpecies(receiver.object, defaultConstructor, context, loc);
    if (constructor.type === "throw") {
        return constructor;
    }
    const property = receiver.object.internalGet("flags", receiver, context, loc);
    if (property.type === "throw") {
        return property;
    }
    const flags = regExpString(property.value, context, loc);
    if (flags.type === "throw") {
        return flags;
    }
    const unicode = flags.value.includes("u") || flags.value.includes("v");
    const newFlags = flags.value.includes("y") ? flags.value : flags.value + "y";
    const construct = context.construct;
    if (construct === undefined) {
        throw new Error("Script construction unavailable");
    }
    const created = construct(
        constructor.value,
        [receiver, { kind: "string", value: newFlags }],
        constructor.value,
        loc,
    );
    if (created.type === "throw") {
        return created;
    }
    if (created.value.kind !== "object") {
        throw new Error("constructed splitter invariant");
    }
    const splitter = created.value.object;
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const array = context.realm.createArray(),
        result: Value = { kind: "object", object: array };
    const limitValue = args.length < 2 ? UNDEFINED : args[1];
    let limit = 4294967295;
    if (limitValue.kind !== "undefined") {
        const primitive = toPrimitive(limitValue, "number", context, loc);
        if (primitive.type === "throw") {
            return primitive;
        }
        const converted = toUint32(primitive.value, loc, context.realm);
        if (converted.type === "throw") {
            return converted;
        }
        limit = converted.value;
    }
    if (limit === 0) {
        return normal(result);
    }
    if (input.value.length === 0) {
        const matched = regExpExec(splitter, input.value, context, loc);
        if (matched.type === "throw") {
            return matched;
        }
        if (matched.value.kind === "null") {
            const added = append(array, 0, { kind: "string", value: "" }, context, loc);
            if (added.type === "throw") {
                return added;
            }
        }
        return normal(result);
    }
    let previous = 0,
        position = 0,
        count = 0;
    while (position < input.value.length) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const set = splitter.set("lastIndex", { kind: "number", value: position }, context, loc);
        if (set.type === "throw") {
            return set;
        }
        const matched = regExpExec(splitter, input.value, context, loc);
        if (matched.type === "throw") {
            return matched;
        }
        if (matched.value.kind === "null") {
            position = advanceStringIndex(input.value, position, unicode);
            continue;
        }
        if (matched.value.kind !== "object") {
            throw new Error("RegExpExec result invariant");
        }
        const lastIndex = splitter.internalGet("lastIndex", created.value, context, loc);
        if (lastIndex.type === "throw") {
            return lastIndex;
        }
        const primitive = toPrimitive(lastIndex.value, "number", context, loc);
        if (primitive.type === "throw") {
            return primitive;
        }
        const length = toLength(primitive.value, loc, context.realm);
        if (length.type === "throw") {
            return length;
        }
        const end = Math.min(length.value, input.value.length);
        if (end === previous) {
            position = advanceStringIndex(input.value, position, unicode);
            continue;
        }
        const prefix = append(
            array,
            count++,
            { kind: "string", value: input.value.slice(previous, position) },
            context,
            loc,
        );
        if (prefix.type === "throw") {
            return prefix;
        }
        if (count === limit) {
            return normal(result);
        }
        previous = end;
        const captures = lengthOfArrayLike(matched.value.object, context, loc);
        if (captures.type === "throw") {
            return captures;
        }
        for (let i = 1; i < captures.value; i++) {
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const value = matched.value.object.internalGet(
                numberToString(i),
                matched.value,
                context,
                loc,
            );
            if (value.type === "throw") {
                return value;
            }
            const capture = append(array, count++, value.value, context, loc);
            if (capture.type === "throw") {
                return capture;
            }
            if (count === limit) {
                return normal(result);
            }
        }
        position = previous;
    }
    const suffix = append(
        array,
        count,
        { kind: "string", value: input.value.slice(previous) },
        context,
        loc,
    );
    return suffix.type === "throw" ? suffix : normal(result);
}

export function registerRegExpSplit(realm: Realm, constructor: GuestObject): void {
    const method = realm.createBuiltin("[Symbol.split]", 2, (receiver, args, context, loc) =>
        split(receiver, args, constructor, context, loc),
    );
    realm.regexpPrototype.bootstrapDefine(wellKnownSplit, {
        value: { kind: "object", object: method },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}
