import type { Realm } from "../realm.js";
import { GuestObject, normal, UNDEFINED, type Builtin } from "../runtime.js";

// A deliberately partial namespace: Number conversion and construction are deferred.
export function registerNumber(realm: Realm): void {
    const namespace = new GuestObject();
    namespace.bootstrapDefine("NaN", { value: { kind: "number", value: NaN }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("POSITIVE_INFINITY", { value: { kind: "number", value: Infinity }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("NEGATIVE_INFINITY", { value: { kind: "number", value: -Infinity }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MAX_VALUE", { value: { kind: "number", value: Number.MAX_VALUE }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MIN_VALUE", { value: { kind: "number", value: Number.MIN_VALUE }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("EPSILON", { value: { kind: "number", value: Number.EPSILON }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MAX_SAFE_INTEGER", { value: { kind: "number", value: Number.MAX_SAFE_INTEGER }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MIN_SAFE_INTEGER", { value: { kind: "number", value: Number.MIN_SAFE_INTEGER }, writable: false, enumerable: false, configurable: false });
    registerPredicate(realm, namespace, "isNaN", (_receiver, args, _context, _loc) => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        return normal({ kind: "boolean", value: value.kind === "number" && Number.isNaN(value.value) });
    });
    registerPredicate(realm, namespace, "isFinite", (_receiver, args, _context, _loc) => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        return normal({ kind: "boolean", value: value.kind === "number" && Number.isFinite(value.value) });
    });
    realm.global.bindings.set("Number", { initialized: true, mutable: true, value: { kind: "object", object: namespace } });
}

function registerPredicate(realm: Realm, namespace: GuestObject, name: string, invoke: Builtin): void {
    const value = realm.registerBuiltin(namespace, name, invoke);
    if (value.kind !== "object") throw new Error("builtin registration must return an object");
    value.object.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: false, enumerable: false, configurable: true });
    value.object.bootstrapDefine("length", { value: { kind: "number", value: 1 }, writable: false, enumerable: false, configurable: true });
}
