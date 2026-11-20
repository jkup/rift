import { getIteratorFromMethod, iteratorCloseNormally, iteratorStepValue } from "../iterator.js";
import type { Realm } from "../realm.js";
import { getSetRecord, type SetRecord } from "../set-record.js";
import { GuestSet } from "../set-object.js";
import {
    languageFailure,
    normal,
    truthy,
    UNDEFINED,
    type OperationContext,
    type ThrowCompletion,
    type ValueCompletion,
} from "../runtime.js";
import type { Location } from "../syntax.js";

type SetCompletion = { type: "normal"; value: GuestSet } | ThrowCompletion;
type SetOperation = "union" | "intersection" | "difference" | "symmetricDifference";

// Algorithms follow ECMAScript Set.prototype methods, using bounded collection
// cursors instead of specification Lists. No guest constructor/add/species is called.
// https://tc39.es/ecma262/#sec-properties-of-the-set-prototype-object
function copySet(set: GuestSet, context: OperationContext, loc: Location): SetCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const result = new GuestSet(context.realm.setPrototype);
    const cursor = set.data.cursor();
    while (true) {
        const next = cursor.next(context, loc);
        if (next.type === "throw") {
            return next;
        }
        if (next.entry === null) {
            return { type: "normal", value: result };
        }
        result.data.set(next.entry.key, UNDEFINED);
    }
}

function difference(
    set: GuestSet,
    other: SetRecord,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    // Difference snapshots before acquiring keys or invoking has.
    const copied = copySet(set, context, loc);
    if (copied.type === "throw") {
        return copied;
    }
    const result = copied.value;
    if (set.data.size > other.size) {
        return combineKeys("difference", set, other, result, context, loc);
    }
    const cursor = result.data.cursor();
    while (true) {
        const next = cursor.next(context, loc);
        if (next.type === "throw") {
            return next;
        }
        if (next.entry === null) {
            return normal({ kind: "object", object: result });
        }
        const key = next.entry.key;
        const present = context.call(other.has, other.object, [key], loc);
        if (present.type === "throw") {
            return present;
        }
        if (truthy(present.value)) {
            result.data.delete(key);
        }
    }
}

function intersection(
    set: GuestSet,
    other: SetRecord,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const result = new GuestSet(context.realm.setPrototype);
    if (set.data.size > other.size) {
        return combineKeys("intersection", set, other, result, context, loc);
    }
    // Unlike difference, intersection visits the live receiver after each callback.
    const cursor = set.data.cursor();
    while (true) {
        const next = cursor.next(context, loc);
        if (next.type === "throw") {
            return next;
        }
        if (next.entry === null) {
            return normal({ kind: "object", object: result });
        }
        const key = next.entry.key;
        const present = context.call(other.has, other.object, [key], loc);
        if (present.type === "throw") {
            return present;
        }
        if (truthy(present.value)) {
            result.data.set(key, UNDEFINED);
        }
    }
}

function combineKeys(
    operation: SetOperation,
    set: GuestSet,
    other: SetRecord,
    prepared: GuestSet | null,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const acquired = getIteratorFromMethod(other.object, other.keys, context, loc);
    if (acquired.type === "throw") {
        return acquired;
    }
    // Union and symmetricDifference snapshot only after keys() and next lookup.
    let result: GuestSet;
    if (prepared instanceof GuestSet) {
        result = prepared;
    } else {
        const copied = copySet(set, context, loc);
        if (copied.type === "throw") {
            return copied;
        }
        result = copied.value;
    }
    while (true) {
        const next = iteratorStepValue(acquired.value, context, loc);
        if (next.type === "throw") {
            return next;
        }
        if (next.done) {
            return normal({ kind: "object", object: result });
        }
        const key = next.value;
        switch (operation) {
            case "union":
                result.data.set(key, UNDEFINED);
                break;
            case "difference":
                result.data.delete(key);
                break;
            case "intersection":
                if (set.data.has(key)) {
                    result.data.set(key, UNDEFINED);
                }
                break;
            case "symmetricDifference":
                // Test the live receiver, not the result: duplicate keys must not toggle.
                if (set.data.has(key)) {
                    result.data.delete(key);
                } else {
                    result.data.set(key, UNDEFINED);
                }
                break;
        }
    }
}

function compareHas(
    set: GuestSet,
    other: SetRecord,
    disjoint: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const cursor = set.data.cursor();
    while (true) {
        const next = cursor.next(context, loc);
        if (next.type === "throw") {
            return next;
        }
        if (next.entry === null) {
            return normal({ kind: "boolean", value: true });
        }
        const present = context.call(other.has, other.object, [next.entry.key], loc);
        if (present.type === "throw") {
            return present;
        }
        if (truthy(present.value) === disjoint) {
            return normal({ kind: "boolean", value: false });
        }
    }
}

function compareKeys(
    set: GuestSet,
    other: SetRecord,
    disjoint: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const acquired = getIteratorFromMethod(other.object, other.keys, context, loc);
    if (acquired.type === "throw") {
        return acquired;
    }
    while (true) {
        const next = iteratorStepValue(acquired.value, context, loc);
        if (next.type === "throw") {
            return next;
        }
        if (next.done) {
            return normal({ kind: "boolean", value: true });
        }
        if (set.data.has(next.value) === disjoint) {
            const closed = iteratorCloseNormally(acquired.value, context, loc);
            if (closed.type === "throw") {
                return closed;
            }
            return normal({ kind: "boolean", value: false });
        }
    }
}

export function registerSetMethods(realm: Realm): void {
    for (const name of [
        "union",
        "intersection",
        "difference",
        "symmetricDifference",
        "isSubsetOf",
        "isSupersetOf",
        "isDisjointFrom",
    ] as const) {
        realm.registerBuiltin(
            realm.setPrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                if (receiver.kind !== "object" || !(receiver.object instanceof GuestSet)) {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "receiver is not a Set",
                        loc,
                    );
                }
                const set = receiver.object;
                const record = getSetRecord(args.length === 0 ? UNDEFINED : args[0], context, loc);
                if (record.type === "throw") {
                    return record;
                }
                const other = record.value;
                switch (name) {
                    case "union":
                    case "symmetricDifference":
                        return combineKeys(name, set, other, null, context, loc);
                    case "intersection":
                        return intersection(set, other, context, loc);
                    case "difference":
                        return difference(set, other, context, loc);
                    case "isSubsetOf":
                        if (set.data.size > other.size) {
                            return normal({ kind: "boolean", value: false });
                        }
                        return compareHas(set, other, false, context, loc);
                    case "isSupersetOf":
                        if (set.data.size < other.size) {
                            return normal({ kind: "boolean", value: false });
                        }
                        return compareKeys(set, other, false, context, loc);
                    case "isDisjointFrom":
                        return set.data.size <= other.size
                            ? compareHas(set, other, true, context, loc)
                            : compareKeys(set, other, true, context, loc);
                }
            },
        );
    }
}
