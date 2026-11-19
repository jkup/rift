import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike, toClampedIndex } from "../array-like.js";
import { numberToString, toIntegerOrInfinity } from "../conversion.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type Value,
    type GuestObject,
    type OperationContext,
    type ValueCompletion,
} from "../runtime.js";
import { toPrimitive } from "../primitive-conversion.js";
import { arraySpeciesCreate } from "../array-species.js";
import type { Location } from "../syntax.js";

function deleteProperty(
    object: GuestObject,
    key: string,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const deleted = object.internalDelete(key);
    if (deleted.type === "throw") {
        return deleted;
    }
    if (!deleted.value) {
        return languageFailure(
            context.realm,
            "TypeError",
            "property is not configurable: " + key,
            loc,
        );
    }
    return normal(UNDEFINED);
}

function moveProperty(
    object: GuestObject,
    from: string,
    to: string,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const present = object.internalHasProperty(from, loc);
    if (present.type === "throw") {
        return present;
    }
    if (!present.value) {
        return deleteProperty(object, to, context, loc);
    }
    const value = object.internalGet(from, { kind: "object", object }, context, loc);
    if (value.type === "throw") {
        return value;
    }
    const written = object.set(to, value.value, context, loc);
    return written.type === "throw" ? written : normal();
}

export function registerArrayRangeMutators(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "fill", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") {
            return boxed;
        }
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") {
            return length;
        }
        const start = toClampedIndex(
            args.length < 2 ? UNDEFINED : args[1],
            length.value,
            context,
            loc,
        );
        if (start.type === "throw") {
            return start;
        }
        let end = length.value;
        if (args.length > 2 && args[2].kind !== "undefined") {
            const converted = toClampedIndex(args[2], length.value, context, loc);
            if (converted.type === "throw") {
                return converted;
            }
            end = converted.value;
        }
        const value = args.length === 0 ? UNDEFINED : args[0];
        for (let k = start.value; k < end; k++) {
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const written = boxed.value.set(numberToString(k), value, context, loc);
            if (written.type === "throw") {
                return written;
            }
        }
        return normal({ kind: "object", object: boxed.value });
    });
    realm.registerBuiltin(realm.arrayPrototype, "copyWithin", 2, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") {
            return boxed;
        }
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") {
            return length;
        }
        const target = toClampedIndex(
            args.length === 0 ? UNDEFINED : args[0],
            length.value,
            context,
            loc,
        );
        if (target.type === "throw") {
            return target;
        }
        const start = toClampedIndex(
            args.length < 2 ? UNDEFINED : args[1],
            length.value,
            context,
            loc,
        );
        if (start.type === "throw") {
            return start;
        }
        let end = length.value;
        if (args.length > 2 && args[2].kind !== "undefined") {
            const converted = toClampedIndex(args[2], length.value, context, loc);
            if (converted.type === "throw") {
                return converted;
            }
            end = converted.value;
        }
        let from = start.value,
            to = target.value;
        let count = Math.min(end - from, length.value - to);
        const direction = from < to && to < from + count ? -1 : 1;
        if (direction === -1) {
            from += count - 1;
            to += count - 1;
        }
        while (count > 0) {
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const moved = moveProperty(
                boxed.value,
                numberToString(from),
                numberToString(to),
                context,
                loc,
            );
            if (moved.type === "throw") {
                return moved;
            }
            from += direction;
            to += direction;
            count--;
        }
        return normal({ kind: "object", object: boxed.value });
    });
}

export function registerArrayMutators(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "push", 1, (receiver, args, context, loc) => {
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
        if (length.value + args.length > 9007199254740991) {
            return languageFailure(
                context.realm,
                "TypeError",
                "push exceeds maximum array-like length",
                loc,
            );
        }
        let next = length.value;
        for (const item of args) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") {
                return iteration;
            }
            const written = boxed.value.set(numberToString(next), item, context, loc);
            if (written.type === "throw") {
                return written;
            }
            next++;
        }
        // Set length even for zero arguments. Set is strict regardless of caller mode.
        const written = boxed.value.set("length", { kind: "number", value: next }, context, loc);
        if (written.type === "throw") {
            return written;
        }
        return normal({ kind: "number", value: next });
    });
    realm.registerBuiltin(realm.arrayPrototype, "pop", 0, (receiver, _args, context, loc) => {
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
        if (length.value === 0) {
            const written = boxed.value.set("length", { kind: "number", value: 0 }, context, loc);
            return written.type === "throw" ? written : normal(UNDEFINED);
        }
        const next = length.value - 1;
        const key = numberToString(next);
        const element = boxed.value.internalGet(
            key,
            { kind: "object", object: boxed.value },
            context,
            loc,
        );
        if (element.type === "throw") {
            return element;
        }
        const deleted = deleteProperty(boxed.value, key, context, loc);
        if (deleted.type === "throw") {
            return deleted;
        }
        const written = boxed.value.set("length", { kind: "number", value: next }, context, loc);
        return written.type === "throw" ? written : element;
    });
    realm.registerBuiltin(realm.arrayPrototype, "shift", 0, (receiver, _args, context, loc) => {
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
        if (length.value === 0) {
            const written = object.set("length", { kind: "number", value: 0 }, context, loc);
            return written.type === "throw" ? written : normal();
        }
        const first = object.internalGet("0", { kind: "object", object }, context, loc);
        if (first.type === "throw") {
            return first;
        }
        for (let index = 1; index < length.value; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") {
                return step;
            }
            const moved = moveProperty(
                object,
                numberToString(index),
                numberToString(index - 1),
                context,
                loc,
            );
            if (moved.type === "throw") {
                return moved;
            }
        }
        const deleted = deleteProperty(object, numberToString(length.value - 1), context, loc);
        if (deleted.type === "throw") {
            return deleted;
        }
        const written = object.set(
            "length",
            { kind: "number", value: length.value - 1 },
            context,
            loc,
        );
        return written.type === "throw" ? written : first;
    });
    realm.registerBuiltin(realm.arrayPrototype, "unshift", 1, (receiver, args, context, loc) => {
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
        const next = length.value + args.length;
        if (next > 9007199254740991) {
            return languageFailure(
                context.realm,
                "TypeError",
                "unshift exceeds maximum array-like length",
                loc,
            );
        }
        if (args.length > 0) {
            for (let index = length.value; index > 0; index--) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                const moved = moveProperty(
                    object,
                    numberToString(index - 1),
                    numberToString(index + args.length - 1),
                    context,
                    loc,
                );
                if (moved.type === "throw") {
                    return moved;
                }
            }
            for (let index = 0; index < args.length; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                const written = object.set(numberToString(index), args[index], context, loc);
                if (written.type === "throw") {
                    return written;
                }
            }
        }
        const written = object.set("length", { kind: "number", value: next }, context, loc);
        return written.type === "throw" ? written : normal({ kind: "number", value: next });
    });
    realm.registerBuiltin(realm.arrayPrototype, "reverse", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") {
            return boxed;
        }
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const object = boxed.value;
        const result: Value = { kind: "object", object };
        const length = lengthOfArrayLike(object, context, loc);
        if (length.type === "throw") {
            return length;
        }
        const middle = Math.floor(length.value / 2);
        for (let lower = 0; lower < middle; lower++) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") {
                return iteration;
            }
            const lowerKey = numberToString(lower);
            const upperKey = numberToString(length.value - lower - 1);
            const lowerExists = object.internalHasProperty(lowerKey, loc);
            if (lowerExists.type === "throw") {
                return lowerExists;
            }
            let lowerValue: Value = UNDEFINED;
            if (lowerExists.value) {
                const read = object.internalGet(lowerKey, result, context, loc);
                if (read.type === "throw") {
                    return read;
                }
                lowerValue = read.value;
            }
            const upperExists = object.internalHasProperty(upperKey, loc);
            if (upperExists.type === "throw") {
                return upperExists;
            }
            let upperValue: Value = UNDEFINED;
            if (upperExists.value) {
                const read = object.internalGet(upperKey, result, context, loc);
                if (read.type === "throw") {
                    return read;
                }
                upperValue = read.value;
            }
            if (lowerExists.value && upperExists.value) {
                const lowerWritten = object.set(lowerKey, upperValue, context, loc);
                if (lowerWritten.type === "throw") {
                    return lowerWritten;
                }
                const upperWritten = object.set(upperKey, lowerValue, context, loc);
                if (upperWritten.type === "throw") {
                    return upperWritten;
                }
            } else if (upperExists.value) {
                const written = object.set(lowerKey, upperValue, context, loc);
                if (written.type === "throw") {
                    return written;
                }
                const deleted = deleteProperty(object, upperKey, context, loc);
                if (deleted.type === "throw") {
                    return deleted;
                }
            } else if (lowerExists.value) {
                const deleted = deleteProperty(object, lowerKey, context, loc);
                if (deleted.type === "throw") {
                    return deleted;
                }
                const written = object.set(upperKey, lowerValue, context, loc);
                if (written.type === "throw") {
                    return written;
                }
            }
        }
        return normal(result);
    });
}

export function registerArraySplice(realm: Realm): void {
    realm.registerBuiltin(
        realm.arrayPrototype,
        "splice",
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
            const clamped = toClampedIndex(
                args.length === 0 ? UNDEFINED : args[0],
                length.value,
                context,
                loc,
            );
            if (clamped.type === "throw") {
                return clamped;
            }
            const start = clamped.value;
            let deleteCount = args.length === 0 ? 0 : length.value - start;
            if (args.length > 1) {
                const primitive = toPrimitive(args[1], "number", context, loc);
                if (primitive.type === "throw") {
                    return primitive;
                }
                const count = toIntegerOrInfinity(primitive.value, loc, context.realm);
                if (count.type === "throw") {
                    return count;
                }
                deleteCount = Math.min(Math.max(count.value, 0), length.value - start);
            }
            const itemCount = Math.max(args.length - 2, 0);
            const nextLength = length.value - deleteCount + itemCount;
            if (nextLength > 9007199254740991) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "splice exceeds maximum array-like length",
                    loc,
                );
            }
            const created = arraySpeciesCreate(object, deleteCount, "splice", context, loc);
            if (created.type === "throw") {
                return created;
            }
            const deleted = created.value;
            for (let index = 0; index < deleteCount; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                const key = numberToString(start + index);
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
                const defined = deleted.defineOwnProperty(
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
                        "splice cannot define result element",
                        loc,
                    );
                }
            }
            const resultLength = deleted.set(
                "length",
                { kind: "number", value: deleteCount },
                context,
                loc,
            );
            if (resultLength.type === "throw") {
                return resultLength;
            }
            if (itemCount < deleteCount) {
                for (let index = start; index < length.value - deleteCount; index++) {
                    const step = context.tick(loc);
                    if (step.type === "throw") {
                        return step;
                    }
                    const moved = moveProperty(
                        object,
                        numberToString(index + deleteCount),
                        numberToString(index + itemCount),
                        context,
                        loc,
                    );
                    if (moved.type === "throw") {
                        return moved;
                    }
                }
                for (let index = length.value; index > nextLength; index--) {
                    const step = context.tick(loc);
                    if (step.type === "throw") {
                        return step;
                    }
                    const removed = deleteProperty(object, numberToString(index - 1), context, loc);
                    if (removed.type === "throw") {
                        return removed;
                    }
                }
            } else if (itemCount > deleteCount) {
                for (let index = length.value - deleteCount; index > start; index--) {
                    const step = context.tick(loc);
                    if (step.type === "throw") {
                        return step;
                    }
                    const moved = moveProperty(
                        object,
                        numberToString(index + deleteCount - 1),
                        numberToString(index + itemCount - 1),
                        context,
                        loc,
                    );
                    if (moved.type === "throw") {
                        return moved;
                    }
                }
            }
            for (let index = 0; index < itemCount; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") {
                    return step;
                }
                const written = object.set(
                    numberToString(start + index),
                    args[index + 2],
                    context,
                    loc,
                );
                if (written.type === "throw") {
                    return written;
                }
            }
            const written = object.set(
                "length",
                { kind: "number", value: nextLength },
                context,
                loc,
            );
            return written.type === "throw" ? written : normal({ kind: "object", object: deleted });
        },
    );
}
