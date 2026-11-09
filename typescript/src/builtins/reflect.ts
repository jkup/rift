import type { Realm } from "../realm.js";
import { lengthOfArrayLike } from "../array-like.js";
import { numberToString } from "../conversion.js";
import { languageFailure, UNDEFINED, type Value, type ValueCompletion } from "../runtime.js";
import { wellKnownToStringTag } from "../symbols.js";

export function registerReflect(realm: Realm): void {
    const reflect = realm.createObject();
    realm.registerBuiltin(reflect, "construct", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object" || target.object.constructorSlot === null)
            return languageFailure(context.realm, "TypeError", "target is not a constructor", loc);
        const newTarget = args.length < 3 ? target : args[2];
        if (newTarget.kind !== "object" || newTarget.object.constructorSlot === null)
            return languageFailure(context.realm, "TypeError", "newTarget is not a constructor", loc);
        const list = args.length < 2 ? UNDEFINED : args[1];
        if (list.kind !== "object") return languageFailure(context.realm, "TypeError", "constructor arguments are not an object", loc);
        const length = lengthOfArrayLike(list.object, context, loc);
        if (length.type === "throw") return length;
        const values: Value[] = [];
        for (let i = 0; i < length.value; i++) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const value = list.object.internalGet(numberToString(i), list, context, loc);
            if (value.type === "throw") return value;
            values.push(value.value);
        }
        const construct = context.construct;
        if (construct === undefined) throw new Error("Script construction unavailable");
        return construct(target, values, newTarget, loc);
    });
    reflect.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Reflect" }, configurable: true });
    realm.defineScriptGlobal("Reflect", { value: { kind: "object", object: reflect }, writable: true, configurable: true });
}
