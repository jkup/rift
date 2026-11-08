import type {Realm} from "../realm.js";
import {toObject} from "../object-conversion.js";
import {numberToString} from "../conversion.js";
import {normal, UNDEFINED, type GuestObject, type OperationContext, type Value, type ValueCompletion} from "../runtime.js";
import type {Location} from "../syntax.js";

function arrayFromList(values: Value[], context: OperationContext, loc: Location): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    const array = context.realm.createArray();
    for (let i = 0; i < values.length; i++) {
        const step = context.tick(loc);
        if (step.type === "throw") return step;
        const defined = array.defineOwnProperty(numberToString(i), {
            value: values[i], writable: true, enumerable: true, configurable: true,
        }, context, loc);
        if (defined.type === "throw") return defined;
        if (!defined.value) throw new Error("fresh enumeration array definition failed");
    }
    return normal({kind: "object", object: array});
}

function enumerate(input: Value, kind: "keys" | "values" | "entries", context: OperationContext, loc: Location): ValueCompletion {
    const boxed = toObject(input, context, loc);
    if (boxed.type === "throw") return boxed;
    const object = boxed.value, receiver: Value = {kind: "object", object};
    const keys = object.ownPropertyKeys(), values: Value[] = [];
    for (const key of keys) {
        const step = context.tick(loc);
        if (step.type === "throw") return step;
        if (typeof key !== "string") continue;
        const descriptor = object.getOwnProperty(key);
        if (descriptor === undefined || !descriptor.enumerable) continue;
        const name: Value = {kind: "string", value: key};
        if (kind === "keys") values.push(name);
        else {
            const value = object.internalGet(key, receiver, context, loc);
            if (value.type === "throw") return value;
            if (kind === "values") values.push(value.value);
            else {
                const entry = arrayFromList([name, value.value], context, loc);
                if (entry.type === "throw") return entry;
                values.push(entry.value);
            }
        }
    }
    return arrayFromList(values, context, loc);
}

export function registerObjectEnumeration(realm: Realm, constructor: GuestObject): void {
    for (const kind of ["keys", "values", "entries"] as const) {
        realm.registerBuiltin(constructor, kind, 1, (_receiver, args, context, loc) =>
            enumerate(args.length === 0 ? UNDEFINED : args[0], kind, context, loc));
    }
    for (const name of ["getOwnPropertyNames", "getOwnPropertySymbols"]) {
        realm.registerBuiltin(constructor, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const boxed = toObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (boxed.type === "throw") return boxed;
            const values: Value[] = [];
            for (const key of boxed.value.ownPropertyKeys()) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                if (typeof key === "string") {
                    if (name === "getOwnPropertyNames") values.push({kind: "string", value: key});
                } else if (name === "getOwnPropertySymbols") values.push({kind: "symbol", value: key});
            }
            return arrayFromList(values, context, loc);
        });
    }
    realm.registerBuiltin(constructor, "assign", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = toObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (target.type === "throw") return target;
        for (let i = 1; i < args.length; i++) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const input = args[i];
            if (input.kind === "undefined" || input.kind === "null") continue;
            const source = toObject(input, context, loc);
            if (source.type === "throw") return source;
            const receiver: Value = {kind: "object", object: source.value};
            for (const key of source.value.ownPropertyKeys()) {
                const step = context.tick(loc);
                if (step.type === "throw") return step;
                const descriptor = source.value.getOwnProperty(key);
                if (descriptor === undefined || !descriptor.enumerable) continue;
                const read = source.value.internalGet(key, receiver, context, loc);
                if (read.type === "throw") return read;
                const written = target.value.set(key, read.value, context, loc);
                if (written.type === "throw") return written;
            }
        }
        return normal({kind: "object", object: target.value});
    });
}
