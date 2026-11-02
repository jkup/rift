import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { normal } from "../runtime.js";

export function registerObjectValueOf(realm: Realm): void {
    realm.registerBuiltin(realm.objectPrototype, "valueOf", 0, (receiver, _args, context, loc) => {
        const result = toObject(receiver, context, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "object", object: result.value });
    });
}
