import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { getIterator, iteratorStepValue } from "../iterator.js";
import { arrayFromList } from "../array-create.js";
import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import {
    GuestError,
    GuestObject,
    UNDEFINED,
    normal,
    languageFailure,
    type ErrorName,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString, type StringCompletion } from "../conversion.js";

function messageString(value: Value, context: OperationContext, loc: Location): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    return toString(primitive.value, loc, context.realm);
}

function createPublicError(
    name: ErrorName,
    callee: GuestObject,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const prototype = getPrototypeFromConstructor(callee, name, context, loc);
    if (prototype.type === "throw") {
        return prototype;
    }
    const proto = prototype.value;
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const error = new GuestError(proto);
    const messageIndex = name === "AggregateError" ? 1 : 0;
    const message = args.length <= messageIndex ? UNDEFINED : args[messageIndex];
    if (message.kind !== "undefined") {
        const converted = messageString(message, context, loc);
        if (converted.type === "throw") {
            return converted;
        }
        error.bootstrapDefine("message", {
            value: { kind: "string", value: converted.value },
            writable: true,
            enumerable: false,
            configurable: true,
        });
    }
    const options = args.length <= messageIndex + 1 ? UNDEFINED : args[messageIndex + 1];
    if (options.kind === "object") {
        const hasBudget = context.tick(loc);
        if (hasBudget.type === "throw") {
            return hasBudget;
        }
        const present = options.object.internalHasProperty("cause", loc);
        if (present.type === "throw") {
            return present;
        }
        if (present.value) {
            const getBudget = context.tick(loc);
            if (getBudget.type === "throw") {
                return getBudget;
            }
            const cause = options.object.internalGet("cause", options, context, loc);
            if (cause.type === "throw") {
                return cause;
            }
            error.bootstrapDefine("cause", {
                value: cause.value,
                writable: true,
                enumerable: false,
                configurable: true,
            });
        }
    }
    if (name === "AggregateError") {
        const iterator = getIterator(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (iterator.type === "throw") {
            return iterator;
        }
        const errors: Value[] = [];
        while (true) {
            const step = iteratorStepValue(iterator.value, context, loc);
            if (step.type === "throw") {
                return step;
            }
            if (step.done) {
                break;
            }
            errors.push(step.value);
        }
        const array = arrayFromList(errors, context, loc);
        if (array.type === "throw") {
            return array;
        }
        error.bootstrapDefine("errors", {
            value: array.value,
            writable: true,
            enumerable: false,
            configurable: true,
        });
    }
    return normal({ kind: "object", object: error });
}

// Trusted bootstrap creates intrinsic objects before publishing mutable globals.
export function createErrorConstructor(realm: Realm, name: ErrorName): GuestObject {
    const constructor = realm.createBuiltinConstructor(
        name,
        name === "AggregateError" ? 2 : 1,
        (_receiver, args, context, loc) => createPublicError(name, constructor, args, context, loc),
        (_callee, newTarget, args, context, loc) =>
            createPublicError(name, newTarget, args, context, loc),
    );
    return constructor;
}

export function registerErrors(realm: Realm): void {
    const names: ErrorName[] = [
        "Error",
        "TypeError",
        "ReferenceError",
        "RangeError",
        "SyntaxError",
        "EvalError",
        "URIError",
        "AggregateError",
    ];
    let errorConstructor: GuestObject | null = null;
    for (const name of names) {
        const constructor = realm.getErrorConstructor(name);
        if (errorConstructor === null) {
            errorConstructor = constructor;
        } else {
            constructor.setPrototypeOf(errorConstructor);
        }
        const proto = realm.getErrorPrototype(name);
        constructor.bootstrapDefine("prototype", {
            value: { kind: "object", object: proto },
            writable: false,
            enumerable: false,
            configurable: false,
        });
        proto.bootstrapDefine("constructor", {
            value: { kind: "object", object: constructor },
            writable: true,
            enumerable: false,
            configurable: true,
        });
        realm.defineScriptGlobal(name, {
            value: { kind: "object", object: constructor },
            writable: true,
            enumerable: false,
            configurable: true,
        });
    }
    realm.registerBuiltin(
        realm.getErrorConstructor("Error"),
        "isError",
        1,
        (_receiver, args, _context, _loc) => {
            const value = args.length === 0 ? UNDEFINED : args[0];
            return normal({
                kind: "boolean",
                value: value.kind === "object" && value.object instanceof GuestError,
            });
        },
    );
    realm.registerBuiltin(
        realm.getErrorPrototype("Error"),
        "toString",
        0,
        (receiver, _args, context, loc) => {
            if (receiver.kind !== "object") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "Error.prototype.toString receiver is not an object",
                    loc,
                );
            }
            const nameBudget = context.tick(loc);
            if (nameBudget.type === "throw") {
                return nameBudget;
            }
            const nameValue = receiver.object.internalGet("name", receiver, context, loc);
            if (nameValue.type === "throw") {
                return nameValue;
            }
            const name =
                nameValue.value.kind === "undefined"
                    ? { type: "normal" as const, value: "Error" }
                    : messageString(nameValue.value, context, loc);
            if (name.type === "throw") {
                return name;
            }
            const messageBudget = context.tick(loc);
            if (messageBudget.type === "throw") {
                return messageBudget;
            }
            const messageValue = receiver.object.internalGet("message", receiver, context, loc);
            if (messageValue.type === "throw") {
                return messageValue;
            }
            const message =
                messageValue.value.kind === "undefined"
                    ? { type: "normal" as const, value: "" }
                    : messageString(messageValue.value, context, loc);
            if (message.type === "throw") {
                return message;
            }
            return normal({
                kind: "string",
                value:
                    name.value === ""
                        ? message.value
                        : message.value === ""
                          ? name.value
                          : name.value + ": " + message.value,
            });
        },
    );
}
