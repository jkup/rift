import type { Realm } from "../realm.js";
import { failure, type Value } from "../runtime.js";

export function registerRestrictedFunctionProperties(realm: Realm): void {
    if (realm.profile !== "script") throw new Error("Script Realm required");
    // Use the ordinary factory so the intrinsic retains the Script execution guard.
    const thrower = realm.createBuiltin("", 0, (_receiver, _args, _context, loc) =>
        failure("TypeError", "restricted function property", loc));
    thrower.bootstrapDefine("name", { configurable: false });
    thrower.bootstrapDefine("length", { configurable: false });
    thrower.preventExtensions();
    const endpoint: Value = { kind: "object", object: thrower };
    for (const key of ["caller", "arguments"]) {
        realm.functionPrototype.bootstrapDefine(key, {
            get: endpoint, set: endpoint, enumerable: false, configurable: true,
        });
    }
}
