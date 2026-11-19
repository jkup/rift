import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { toPrimitive } from "../primitive-conversion.js";
import { invoke } from "../invoke.js";
import { normal, type Value, type ValueCompletion } from "../runtime.js";

export function registerDateJSON(realm: Realm): void {
    realm.registerBuiltin(
        realm.datePrototype,
        "toJSON",
        1,
        (receiver, _args, context, loc): ValueCompletion => {
            const object = toObject(receiver, context, loc);
            if (object.type === "throw") {
                return object;
            }
            const value: Value = { kind: "object", object: object.value };
            const primitive = toPrimitive(value, "number", context, loc);
            if (primitive.type === "throw") {
                return primitive;
            }
            if (primitive.value.kind === "number" && !Number.isFinite(primitive.value.value)) {
                return normal({ kind: "null" });
            }
            return invoke(value, "toISOString", [], context, loc);
        },
    );
}
