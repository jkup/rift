import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { toPrimitive } from "../primitive-conversion.js";
import { numberToString, toNumber, toString, type NumberCompletion } from "../conversion.js";
import { stringCompare } from "../strings.js";
import { languageFailure, normal, UNDEFINED, type Value, type ValueCompletion, type ThrowCompletion, type OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

type ValueListCompletion = { type: "normal"; value: Value[] } | ThrowCompletion;

function compareElements(left: Value, right: Value, comparator: Value, context: OperationContext, loc: Location): NumberCompletion {
    if (left.kind === "undefined") return { type: "normal", value: right.kind === "undefined" ? 0 : 1 };
    if (right.kind === "undefined") return { type: "normal", value: -1 };
    if (comparator.kind !== "undefined") {
        const called = context.call(comparator, UNDEFINED, [left, right], loc);
        if (called.type === "throw") return called;
        const primitive = toPrimitive(called.value, "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const number = toNumber(primitive.value, loc, context.realm);
        if (number.type === "throw") return number;
        return { type: "normal", value: Number.isNaN(number.value) ? 0 : number.value };
    }
    const leftPrimitive = toPrimitive(left, "string", context, loc);
    if (leftPrimitive.type === "throw") return leftPrimitive;
    const leftString = toString(leftPrimitive.value, loc, context.realm);
    if (leftString.type === "throw") return leftString;
    const rightPrimitive = toPrimitive(right, "string", context, loc);
    if (rightPrimitive.type === "throw") return rightPrimitive;
    const rightString = toString(rightPrimitive.value, loc, context.realm);
    if (rightString.type === "throw") return rightString;
    return { type: "normal", value: stringCompare(leftString.value, rightString.value) };
}

function stableSort(values: Value[], comparator: Value, context: OperationContext, loc: Location): ValueListCompletion {
    let source = values;
    let target: Value[] = [];
    for (let width = 1; width < values.length; width *= 2) {
        for (let start = 0; start < values.length; start += width * 2) {
            const middle = Math.min(start + width, values.length);
            const end = Math.min(start + width * 2, values.length);
            let left = start, right = middle;
            for (let index = start; index < end; index++) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                if (left === middle) target[index] = source[right++];
                else if (right === end) target[index] = source[left++];
                else {
                    const compared = compareElements(source[left], source[right], comparator, context, loc);
                    if (compared.type === "throw") return compared;
                    // Taking the left element on ties preserves original order.
                    target[index] = compared.value <= 0 ? source[left++] : source[right++];
                }
            }
        }
        const previous = source;
        source = target;
        target = previous;
    }
    return { type: "normal", value: source };
}

export function registerArraySort(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "sort", 1, (receiver, args, context, loc): ValueCompletion => {
        const comparator = args.length === 0 ? UNDEFINED : args[0];
        if (comparator.kind !== "undefined" && (comparator.kind !== "object" || comparator.object.callable === null))
            return languageFailure(context.realm, "TypeError", "sort comparator is not callable", loc);
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const object = boxed.value;
        const input: Value = { kind: "object", object };
        const length = lengthOfArrayLike(object, context, loc);
        if (length.type === "throw") return length;
        const values: Value[] = [];
        for (let index = 0; index < length.value; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            const key = numberToString(index);
            const present = object.internalHasProperty(key, loc);
            if (present.type === "throw") return present;
            if (!present.value) continue;
            const value = object.internalGet(key, input, context, loc);
            if (value.type === "throw") return value;
            values.push(value.value);
        }
        const sorted = stableSort(values, comparator, context, loc);
        if (sorted.type === "throw") return sorted;
        for (let index = 0; index < sorted.value.length; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            const written = object.set(numberToString(index), sorted.value[index], context, loc);
            if (written.type === "throw") return written;
        }
        for (let index = sorted.value.length; index < length.value; index++) {
            const step = context.tick(loc);
            if (step.type === "throw") return step;
            const key = numberToString(index);
            const deleted = object.internalDelete(key);
            if (deleted.type === "throw") return deleted;
            if (!deleted.value) return languageFailure(context.realm, "TypeError", "property is not configurable: " + key, loc);
        }
        return normal(input);
    });
}
