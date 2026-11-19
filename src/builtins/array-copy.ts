import { toPrimitive } from "../primitive-conversion.js";
import { createArrayWithLength } from "../array-create.js";
import { GuestArray } from "../array-object.js";
import { wellKnownIsConcatSpreadable } from "../symbols.js";
import type { Location } from "../syntax.js";
import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike, toClampedIndex } from "../array-like.js";
import { arraySpeciesCreate } from "../array-species.js";
import { numberToString, toIntegerOrInfinity } from "../conversion.js";
import {
    languageFailure,
    normal,
    truthy,
    UNDEFINED,
    type Value,
    type GuestObject,
    type OperationContext,
    type ValueCompletion,
    type InternalBooleanCompletion,
} from "../runtime.js";

export function registerArraySlice(realm: Realm): void {
    realm.registerBuiltin(
        realm.arrayPrototype,
        "slice",
        2,
        (receiver, args, context, loc): ValueCompletion => {
            const boxed = toObject(receiver, context, loc);
            if (boxed.type === "throw") {
                return boxed;
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const object = boxed.value;
            const length = lengthOfArrayLike(object, context, loc);
            if (length.type === "throw") {
                return length;
            }
            const start = toClampedIndex(
                args.length === 0 ? UNDEFINED : args[0],
                length.value,
                context,
                loc,
            );
            if (start.type === "throw") {
                return start;
            }
            let end = length.value;
            if (args.length > 1 && args[1].kind !== "undefined") {
                const converted = toClampedIndex(args[1], length.value, context, loc);
                if (converted.type === "throw") {
                    return converted;
                }
                end = converted.value;
            }
            const count = Math.max(end - start.value, 0);
            const created = arraySpeciesCreate(object, count, "slice", context, loc);
            if (created.type === "throw") {
                return created;
            }
            const result = created.value;
            for (let index = 0; index < count; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                const key = numberToString(start.value + index);
                const present = object.internalHasProperty(key, loc);
                if (present.type === "throw") {
                    return present;
                }
                if (!present.value) {
                    continue;
                }
                const value = object.internalGet(key, { kind: "object", object }, context, loc);
                if (value.type === "throw") {
                    return value;
                }
                const defined = result.defineOwnProperty(
                    numberToString(index),
                    { value: value.value, writable: true, enumerable: true, configurable: true },
                    context,
                    loc,
                );
                if (defined.type === "throw") {
                    return defined;
                }
                if (!defined.value) {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "slice cannot define result element",
                        loc,
                    );
                }
            }
            const resized = result.set("length", { kind: "number", value: count }, context, loc);
            return resized.type === "throw" ? resized : normal({ kind: "object", object: result });
        },
    );
}

function isConcatSpreadable(
    value: Value,
    context: OperationContext,
    loc: Location,
): InternalBooleanCompletion {
    if (value.kind !== "object") {
        return { type: "normal", value: false };
    }
    const spreadable = value.object.internalGet(wellKnownIsConcatSpreadable, value, context, loc);
    if (spreadable.type === "throw") {
        return spreadable;
    }
    return {
        type: "normal",
        value:
            spreadable.value.kind === "undefined"
                ? value.object instanceof GuestArray
                : truthy(spreadable.value),
    };
}

function defineElement(
    object: GuestObject,
    index: number,
    value: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const defined = object.defineOwnProperty(
        numberToString(index),
        { value, writable: true, enumerable: true, configurable: true },
        context,
        loc,
    );
    if (defined.type === "throw") {
        return defined;
    }
    if (!defined.value) {
        return languageFailure(context.realm, "TypeError", "cannot define result element", loc);
    }
    return normal();
}

export function registerArrayConcat(realm: Realm): void {
    realm.registerBuiltin(
        realm.arrayPrototype,
        "concat",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const boxed = toObject(receiver, context, loc);
            if (boxed.type === "throw") {
                return boxed;
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const created = arraySpeciesCreate(boxed.value, 0, "concat", context, loc);
            if (created.type === "throw") {
                return created;
            }
            const result = created.value;
            let nextIndex = 0;
            // Visit the boxed receiver first without allocating a second argument list.
            for (let index = -1; index < args.length; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                const item: Value =
                    index < 0 ? { kind: "object", object: boxed.value } : args[index];
                const spreadable = isConcatSpreadable(item, context, loc);
                if (spreadable.type === "throw") {
                    return spreadable;
                }
                if (spreadable.value) {
                    if (item.kind !== "object") {
                        throw new Error("spreadable object invariant");
                    }
                    const length = lengthOfArrayLike(item.object, context, loc);
                    if (length.type === "throw") {
                        return length;
                    }
                    if (nextIndex + length.value > 9007199254740991) {
                        return languageFailure(
                            context.realm,
                            "TypeError",
                            "concat exceeds maximum array-like length",
                            loc,
                        );
                    }
                    for (let sourceIndex = 0; sourceIndex < length.value; sourceIndex++) {
                        const iteration = context.tick(loc);
                        if (iteration.type === "throw") {
                            return iteration;
                        }
                        const key = numberToString(sourceIndex);
                        const present = item.object.internalHasProperty(key, loc);
                        if (present.type === "throw") {
                            return present;
                        }
                        if (present.value) {
                            const value = item.object.internalGet(key, item, context, loc);
                            if (value.type === "throw") {
                                return value;
                            }
                            const defined = defineElement(
                                result,
                                nextIndex,
                                value.value,
                                context,
                                loc,
                            );
                            if (defined.type === "throw") {
                                return defined;
                            }
                        }
                        nextIndex++;
                    }
                } else {
                    if (nextIndex >= 9007199254740991) {
                        return languageFailure(
                            context.realm,
                            "TypeError",
                            "concat exceeds maximum array-like length",
                            loc,
                        );
                    }
                    const defined = defineElement(result, nextIndex++, item, context, loc);
                    if (defined.type === "throw") {
                        return defined;
                    }
                }
            }
            const length = result.set("length", { kind: "number", value: nextIndex }, context, loc);
            return length.type === "throw" ? length : normal({ kind: "object", object: result });
        },
    );
}

export function registerArrayToReversed(realm: Realm): void {
    realm.registerBuiltin(
        realm.arrayPrototype,
        "toReversed",
        0,
        (receiver, _args, context, loc): ValueCompletion => {
            const boxed = toObject(receiver, context, loc);
            if (boxed.type === "throw") {
                return boxed;
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const length = lengthOfArrayLike(boxed.value, context, loc);
            if (length.type === "throw") {
                return length;
            }
            const created = createArrayWithLength(length.value, context, loc);
            if (created.type === "throw") {
                return created;
            }
            for (let index = 0; index < length.value; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                const value = boxed.value.internalGet(
                    numberToString(length.value - index - 1),
                    { kind: "object", object: boxed.value },
                    context,
                    loc,
                );
                if (value.type === "throw") {
                    return value;
                }
                const defined = defineElement(created.value, index, value.value, context, loc);
                if (defined.type === "throw") {
                    return defined;
                }
            }
            return normal({ kind: "object", object: created.value });
        },
    );
}

export function registerArrayToSpliced(realm: Realm): void {
    realm.registerBuiltin(
        realm.arrayPrototype,
        "toSpliced",
        2,
        (receiver, args, context, loc): ValueCompletion => {
            const boxed = toObject(receiver, context, loc);
            if (boxed.type === "throw") {
                return boxed;
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const length = lengthOfArrayLike(boxed.value, context, loc);
            if (length.type === "throw") {
                return length;
            }
            const start = toClampedIndex(
                args.length === 0 ? UNDEFINED : args[0],
                length.value,
                context,
                loc,
            );
            if (start.type === "throw") {
                return start;
            }
            let skipCount = args.length === 0 ? 0 : length.value - start.value;
            if (args.length > 1) {
                const primitive = toPrimitive(args[1], "number", context, loc);
                if (primitive.type === "throw") {
                    return primitive;
                }
                const count = toIntegerOrInfinity(primitive.value, loc, context.realm);
                if (count.type === "throw") {
                    return count;
                }
                skipCount = Math.min(Math.max(count.value, 0), length.value - start.value);
            }
            const insertCount = Math.max(args.length - 2, 0);
            const nextLength = length.value - skipCount + insertCount;
            if (nextLength > 9007199254740991) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "toSpliced exceeds maximum array-like length",
                    loc,
                );
            }
            const created = createArrayWithLength(nextLength, context, loc);
            if (created.type === "throw") {
                return created;
            }
            for (let index = 0; index < nextLength; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                let value: Value;
                if (index >= start.value && index < start.value + insertCount) {
                    value = args[index - start.value + 2];
                } else {
                    const sourceIndex =
                        index < start.value ? index : index - insertCount + skipCount;
                    const read = boxed.value.internalGet(
                        numberToString(sourceIndex),
                        { kind: "object", object: boxed.value },
                        context,
                        loc,
                    );
                    if (read.type === "throw") {
                        return read;
                    }
                    value = read.value;
                }
                const defined = defineElement(created.value, index, value, context, loc);
                if (defined.type === "throw") {
                    return defined;
                }
            }
            return normal({ kind: "object", object: created.value });
        },
    );
}

export function registerArrayWith(realm: Realm): void {
    realm.registerBuiltin(
        realm.arrayPrototype,
        "with",
        2,
        (receiver, args, context, loc): ValueCompletion => {
            const boxed = toObject(receiver, context, loc);
            if (boxed.type === "throw") {
                return boxed;
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const length = lengthOfArrayLike(boxed.value, context, loc);
            if (length.type === "throw") {
                return length;
            }
            const primitive = toPrimitive(
                args.length === 0 ? UNDEFINED : args[0],
                "number",
                context,
                loc,
            );
            if (primitive.type === "throw") {
                return primitive;
            }
            const relative = toIntegerOrInfinity(primitive.value, loc, context.realm);
            if (relative.type === "throw") {
                return relative;
            }
            const selected = relative.value < 0 ? length.value + relative.value : relative.value;
            if (selected < 0 || selected >= length.value) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "with index is out of range",
                    loc,
                );
            }
            const created = createArrayWithLength(length.value, context, loc);
            if (created.type === "throw") {
                return created;
            }
            const replacement = args.length < 2 ? UNDEFINED : args[1];
            for (let index = 0; index < length.value; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                let value = replacement;
                if (index !== selected) {
                    const read = boxed.value.internalGet(
                        numberToString(index),
                        { kind: "object", object: boxed.value },
                        context,
                        loc,
                    );
                    if (read.type === "throw") {
                        return read;
                    }
                    value = read.value;
                }
                const defined = defineElement(created.value, index, value, context, loc);
                if (defined.type === "throw") {
                    return defined;
                }
            }
            return normal({ kind: "object", object: created.value });
        },
    );
}
