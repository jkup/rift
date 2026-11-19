import { PrivateName, PrivateEnvironment } from "./private-names.js";
import { GuestObject, normal, languageFailure, type Value, type ValueCompletion, type ThrowCompletion,
    type OperationContext, type PrivateElement, type InternalBooleanCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export type PrivateNameCompletion = { type: "normal"; value: PrivateName } | ThrowCompletion;

export function declarePrivateName(environment: PrivateEnvironment, description: string, context: OperationContext, loc: Location): PrivateNameCompletion {
    const tick = context.tick(loc);
    return tick.type === "throw" ? tick : { type: "normal", value: environment.declare(description) };
}

export function resolvePrivateName(environment: PrivateEnvironment | null, description: string, context: OperationContext, loc: Location): PrivateNameCompletion {
    for (let current = environment; current !== null; current = current.outer) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const name = current.ownName(description);
        if (name !== undefined) return { type: "normal", value: name };
    }
    throw new Error("unresolved private name after syntax validation");
}

function privateAdd(receiver: GuestObject, name: PrivateName, entry: PrivateElement, context: OperationContext, loc: Location): ValueCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    return receiver.addPrivateElement(name, entry) ? normal()
        : languageFailure(context.realm, "TypeError", "private element already exists", loc);
}

export function privateFieldAdd(receiver: GuestObject, name: PrivateName, value: Value, context: OperationContext, loc: Location): ValueCompletion {
    return privateAdd(receiver, name, { kind: "field", value }, context, loc);
}

export function privateMethodOrAccessorAdd(receiver: GuestObject, name: PrivateName, entry: PrivateElement, context: OperationContext, loc: Location): ValueCompletion {
    if (entry.kind === "field") throw new Error("private method insertion received a field");
    if (entry.kind === "method") validateCallable(entry.value, false);
    else { validateCallable(entry.get, true); validateCallable(entry.set, true); }
    return privateAdd(receiver, name, entry, context, loc);
}

function validateCallable(value: Value, optional: boolean): void {
    if (optional && value.kind === "undefined") return;
    if (value.kind !== "object" || value.object.callable === null) throw new Error("invalid private callable");
}

export function privateGet(receiver: Value, name: PrivateName, context: OperationContext, loc: Location): ValueCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    const entry = receiver.kind === "object" ? receiver.object.findPrivateElement(name) : undefined;
    if (entry === undefined) return languageFailure(context.realm, "TypeError", "receiver lacks private element", loc);
    if (entry.kind !== "accessor") return normal(entry.value);
    if (entry.get.kind === "undefined") return languageFailure(context.realm, "TypeError", "private accessor has no getter", loc);
    return context.call(entry.get, receiver, [], loc);
}

export function privateSet(receiver: Value, name: PrivateName, value: Value, context: OperationContext, loc: Location): ValueCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    const entry = receiver.kind === "object" ? receiver.object.findPrivateElement(name) : undefined;
    if (entry === undefined) return languageFailure(context.realm, "TypeError", "receiver lacks private element", loc);
    if (entry.kind === "method") return languageFailure(context.realm, "TypeError", "private method is not writable", loc);
    if (entry.kind === "field") { entry.value = value; return normal(); }
    if (entry.set.kind === "undefined") return languageFailure(context.realm, "TypeError", "private accessor has no setter", loc);
    const result = context.call(entry.set, receiver, [value], loc);
    return result.type === "throw" ? result : normal();
}

export function privateHas(receiver: Value, name: PrivateName, context: OperationContext, loc: Location): InternalBooleanCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    if (receiver.kind !== "object") return languageFailure(context.realm, "TypeError", "private in requires an object", loc);
    return { type: "normal", value: receiver.object.findPrivateElement(name) !== undefined };
}
