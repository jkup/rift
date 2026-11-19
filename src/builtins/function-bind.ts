import type { Realm } from "../realm.js";
import { GuestObject, UNDEFINED, languageFailure, normal, type BoundCallable, type Value } from "../runtime.js";
import { toIntegerOrInfinity } from "../conversion.js";

export function registerFunctionBind(realm: Realm): void {
    realm.registerBuiltin(realm.functionPrototype, "bind", 1, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || receiver.object.callable === null)
            return languageFailure(context.realm, "TypeError", "Function.prototype.bind receiver is not callable", loc);
        const target = receiver.object;
        const callable = target.callable;
        if (callable === null) throw new Error("missing bind target callable");
        if (callable.realm.profile !== context.realm.profile) throw new Error("cross-profile callable invocation");
        const boundArgs: Value[] = [];
        for (let i = 1; i < args.length; i++) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            boundArgs.push(args[i]);
        }
        const prototype = target.getPrototypeOf();
        const allocation = context.tick(loc);
        if (allocation.type === "throw") return allocation;
        const bound: BoundCallable = { kind: "bound", realm: callable.realm, target,
            receiver: args.length === 0 ? UNDEFINED : args[0], args: boundArgs };
        const result = new GuestObject(prototype, false, bound, target.constructorSlot === null ? null : bound);
        let length = 0;
        if (target.getOwnProperty("length") !== undefined) {
            const value = target.internalGet("length", receiver, context, loc);
            if (value.type === "throw") return value;
            if (value.value.kind === "number") {
                const integer = toIntegerOrInfinity(value.value, loc, context.realm);
                if (integer.type === "throw") return integer;
                length = Math.max(integer.value - boundArgs.length, 0);
            }
        }
        result.bootstrapDefine("length", { value: { kind: "number", value: length }, configurable: true });
        const name = target.internalGet("name", receiver, context, loc);
        if (name.type === "throw") return name;
        const targetName = name.value.kind === "string" ? name.value.value : "";
        result.bootstrapDefine("name", { value: { kind: "string", value: "bound " + targetName }, configurable: true });
        return normal({ kind: "object", object: result });
    });
}
