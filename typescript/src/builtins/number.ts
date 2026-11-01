import type { Realm } from "../realm.js";
import { GuestObject, normal, UNDEFINED, type Builtin } from "../runtime.js";

// A deliberately partial namespace: Number conversion and construction are deferred.
export function registerNumber(realm: Realm): void {
    const namespace = new GuestObject();
    namespace.define("NaN", { kind: "number", value: NaN }, false, false, false);
    namespace.define("POSITIVE_INFINITY", { kind: "number", value: Infinity }, false, false, false);
    namespace.define("NEGATIVE_INFINITY", { kind: "number", value: -Infinity }, false, false, false);
    namespace.define("MAX_VALUE", { kind: "number", value: Number.MAX_VALUE }, false, false, false);
    namespace.define("MIN_VALUE", { kind: "number", value: Number.MIN_VALUE }, false, false, false);
    namespace.define("EPSILON", { kind: "number", value: Number.EPSILON }, false, false, false);
    namespace.define("MAX_SAFE_INTEGER", { kind: "number", value: Number.MAX_SAFE_INTEGER }, false, false, false);
    namespace.define("MIN_SAFE_INTEGER", { kind: "number", value: Number.MIN_SAFE_INTEGER }, false, false, false);
    registerPredicate(realm, namespace, "isNaN", (_receiver, args, _loc) => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        return normal({ kind: "boolean", value: value.kind === "number" && Number.isNaN(value.value) });
    });
    registerPredicate(realm, namespace, "isFinite", (_receiver, args, _loc) => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        return normal({ kind: "boolean", value: value.kind === "number" && Number.isFinite(value.value) });
    });
    realm.global.bindings.set("Number", { initialized: true, mutable: true, value: { kind: "object", object: namespace } });
}

function registerPredicate(realm: Realm, namespace: GuestObject, name: string, invoke: Builtin): void {
    const value = realm.registerBuiltin(namespace, name, invoke);
    if (value.kind !== "object") throw new Error("builtin registration must return an object");
    value.object.define("name", { kind: "string", value: name }, false, false, true);
    value.object.define("length", { kind: "number", value: 1 }, false, false, true);
}
