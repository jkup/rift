import { GuestArray } from "./array-object.js";
import { lengthOfArrayLike } from "./array-like.js";
import { numberToString } from "./conversion.js";
import {
    UNDEFINED,
    type GuestObject,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "./runtime.js";
import type { Location } from "./syntax.js";

type Frame = {
    holder: GuestObject;
    key: string;
    value: Value;
    entered: boolean;
    keys: string[];
    length: number;
    index: number;
};

function frame(holder: GuestObject, key: string): Frame {
    return { holder, key, value: UNDEFINED, entered: false, keys: [], length: 0, index: 0 };
}

export function reviveJSON(
    value: Value,
    reviver: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const root = context.realm.createObject();
    root.bootstrapDefine("", { value, writable: true, enumerable: true, configurable: true });
    const stack: Frame[] = [frame(root, "")];
    while (stack.length > 0) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const current = stack[stack.length - 1];
        if (!current.entered) {
            const read = current.holder.internalGet(
                current.key,
                { kind: "object", object: current.holder },
                context,
                loc,
            );
            if (read.type === "throw") {
                return read;
            }
            current.value = read.value;
            current.entered = true;
            if (read.value.kind === "object") {
                const object = read.value.object;
                if (object instanceof GuestArray) {
                    const length = lengthOfArrayLike(object, context, loc);
                    if (length.type === "throw") {
                        return length;
                    }
                    current.length = length.value;
                } else {
                    for (const key of object.ownPropertyKeys()) {
                        const step = context.tick(loc);
                        if (step.type === "throw") {
                            return step;
                        }
                        if (typeof key !== "string") {
                            continue;
                        }
                        const descriptor = object.getOwnProperty(key);
                        if (descriptor !== undefined && descriptor.enumerable) {
                            current.keys.push(key);
                        }
                    }
                    current.length = current.keys.length;
                }
            }
        }
        if (current.value.kind === "object" && current.index < current.length) {
            const key =
                current.value.object instanceof GuestArray
                    ? numberToString(current.index)
                    : current.keys[current.index];
            current.index++;
            stack.push(frame(current.value.object, key));
            continue;
        }
        const revived = context.call(
            reviver,
            { kind: "object", object: current.holder },
            [{ kind: "string", value: current.key }, current.value],
            loc,
        );
        if (revived.type === "throw") {
            return revived;
        }
        stack.pop();
        if (stack.length === 0) {
            return revived;
        }
        // False deletion/definition results are intentionally ignored by InternalizeJSONProperty.
        const updated =
            revived.value.kind === "undefined"
                ? current.holder.internalDelete(current.key)
                : current.holder.defineOwnProperty(
                      current.key,
                      {
                          value: revived.value,
                          writable: true,
                          enumerable: true,
                          configurable: true,
                      },
                      context,
                      loc,
                  );
        if (updated.type === "throw") {
            return updated;
        }
    }
    throw new Error("JSON reviver stack invariant");
}
