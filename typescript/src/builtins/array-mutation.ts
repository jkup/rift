import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { numberToString } from "../conversion.js";
import { languageFailure, normal, UNDEFINED, type Value, type GuestObject, type OperationContext, type ValueCompletion } from "../runtime.js";
import type { Location } from "../syntax.js";

function deleteProperty(object: GuestObject, key: string, context: OperationContext, loc: Location): ValueCompletion {
    const deleted = object.internalDelete(key);
    if (deleted.type === "throw") return deleted;
    if (!deleted.value) return languageFailure(context.realm, "TypeError", "property is not configurable: " + key, loc);
    return normal(UNDEFINED);
}

function moveProperty(object: GuestObject, from: string, to: string, context: OperationContext, loc: Location): ValueCompletion {
    const present = object.internalHasProperty(from, loc);
    if (present.type === "throw") return present;
    if (!present.value) return deleteProperty(object, to, context, loc);
    const value = object.internalGet(from, { kind: "object", object }, context, loc);
    if (value.type === "throw") return value;
    const written = object.set(to, value.value, context, loc);
    return written.type === "throw" ? written : normal();
}

export function registerArrayMutators(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "push", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        if (length.value + args.length > 9007199254740991) {
            return languageFailure(context.realm, "TypeError", "push exceeds maximum array-like length", loc);
        }
        let next = length.value;
        for (const item of args) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") return iteration;
            const written = boxed.value.set(numberToString(next), item, context, loc);
            if (written.type === "throw") return written;
            next++;
        }
        // Set length even for zero arguments. Set is strict regardless of caller mode.
        const written = boxed.value.set("length", { kind: "number", value: next }, context, loc);
        if (written.type === "throw") return written;
        return normal({ kind: "number", value: next });
    });
    realm.registerBuiltin(realm.arrayPrototype, "pop", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        if (length.value === 0) {
            const written = boxed.value.set("length", { kind: "number", value: 0 }, context, loc);
            return written.type === "throw" ? written : normal(UNDEFINED);
        }
        const next = length.value - 1;
        const key = numberToString(next);
        const element = boxed.value.internalGet(key, { kind: "object", object: boxed.value }, context, loc);
        if (element.type === "throw") return element;
        const deleted = deleteProperty(boxed.value, key, context, loc);
        if (deleted.type === "throw") return deleted;
        const written = boxed.value.set("length", { kind: "number", value: next }, context, loc);
        return written.type === "throw" ? written : element;
    });
    realm.registerBuiltin(realm.arrayPrototype, "shift", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const object = boxed.value;
        const length = lengthOfArrayLike(object, context, loc);
        if (length.type === "throw") return length;
        if (length.value === 0) {
            const written = object.set("length", { kind: "number", value: 0 }, context, loc);
            return written.type === "throw" ? written : normal();
        }
        const first = object.internalGet("0", { kind: "object", object }, context, loc);
        if (first.type === "throw") return first;
        for (let index = 1; index < length.value; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            const moved = moveProperty(object, numberToString(index), numberToString(index - 1), context, loc);
            if (moved.type === "throw") return moved;
        }
        const deleted = deleteProperty(object, numberToString(length.value - 1), context, loc);
        if (deleted.type === "throw") return deleted;
        const written = object.set("length", { kind: "number", value: length.value - 1 }, context, loc);
        return written.type === "throw" ? written : first;
    });
    realm.registerBuiltin(realm.arrayPrototype, "unshift", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const object = boxed.value;
        const length = lengthOfArrayLike(object, context, loc);
        if (length.type === "throw") return length;
        const next = length.value + args.length;
        if (next > 9007199254740991) return languageFailure(context.realm, "TypeError", "unshift exceeds maximum array-like length", loc);
        if (args.length > 0) {
            for (let index = length.value; index > 0; index--) {
                const step = context.tick(loc);
                if (step.type === "throw") return step;
                const moved = moveProperty(object, numberToString(index - 1), numberToString(index + args.length - 1), context, loc);
                if (moved.type === "throw") return moved;
            }
            for (let index = 0; index < args.length; index++) {
                const step = context.tick(loc);
                if (step.type === "throw") return step;
                const written = object.set(numberToString(index), args[index], context, loc);
                if (written.type === "throw") return written;
            }
        }
        const written = object.set("length", { kind: "number", value: next }, context, loc);
        return written.type === "throw" ? written : normal({ kind: "number", value: next });
    });
    realm.registerBuiltin(realm.arrayPrototype, "reverse", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const object = boxed.value;
        const result: Value = { kind: "object", object };
        const length = lengthOfArrayLike(object, context, loc);
        if (length.type === "throw") return length;
        const middle = Math.floor(length.value / 2);
        for (let lower = 0; lower < middle; lower++) {
            const iteration = context.tick(loc);
            if (iteration.type === "throw") return iteration;
            const lowerKey = numberToString(lower);
            const upperKey = numberToString(length.value - lower - 1);
            const lowerExists = object.internalHasProperty(lowerKey, loc);
            if (lowerExists.type === "throw") return lowerExists;
            let lowerValue: Value = UNDEFINED;
            if (lowerExists.value) {
                const read = object.internalGet(lowerKey, result, context, loc);
                if (read.type === "throw") return read;
                lowerValue = read.value;
            }
            const upperExists = object.internalHasProperty(upperKey, loc);
            if (upperExists.type === "throw") return upperExists;
            let upperValue: Value = UNDEFINED;
            if (upperExists.value) {
                const read = object.internalGet(upperKey, result, context, loc);
                if (read.type === "throw") return read;
                upperValue = read.value;
            }
            if (lowerExists.value && upperExists.value) {
                const lowerWritten = object.set(lowerKey, upperValue, context, loc);
                if (lowerWritten.type === "throw") return lowerWritten;
                const upperWritten = object.set(upperKey, lowerValue, context, loc);
                if (upperWritten.type === "throw") return upperWritten;
            } else if (upperExists.value) {
                const written = object.set(lowerKey, upperValue, context, loc);
                if (written.type === "throw") return written;
                const deleted = deleteProperty(object, upperKey, context, loc);
                if (deleted.type === "throw") return deleted;
            } else if (lowerExists.value) {
                const deleted = deleteProperty(object, lowerKey, context, loc);
                if (deleted.type === "throw") return deleted;
                const written = object.set(upperKey, lowerValue, context, loc);
                if (written.type === "throw") return written;
            }
        }
        return normal(result);
    });
}
