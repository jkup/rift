import type { Realm } from "./realm.js";
import { normal, type OperationContext, type Value, type ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export function iteratorResult(
    value: Value,
    done: boolean,
    context: OperationContext,
    loc: Location,
    realm: Realm = context.realm,
): ValueCompletion {
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const result = realm.createObject();
    result.bootstrapDefine("value", {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
    });
    result.bootstrapDefine("done", {
        value: { kind: "boolean", value: done },
        writable: true,
        enumerable: true,
        configurable: true,
    });
    return normal({ kind: "object", object: result });
}
